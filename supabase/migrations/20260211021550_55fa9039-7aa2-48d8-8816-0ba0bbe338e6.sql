
-- ============================================================
-- PHASE 1.2: Credential Intake + Payment Gate
-- ============================================================

-- 1. RPC: Submit/edit credential intake (versioned)
CREATE OR REPLACE FUNCTION public.upsert_credential_intake(
  _candidate_id uuid,
  _form_data jsonb
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _caller_id uuid := auth.uid();
  _candidate_user_id uuid;
  _candidate_status text;
  _is_assigned boolean;
  _is_admin boolean;
  _current_version int;
  _new_id uuid;
  _old_data jsonb;
BEGIN
  -- Get candidate info
  SELECT user_id, status INTO _candidate_user_id, _candidate_status
  FROM candidates WHERE id = _candidate_id;

  IF _candidate_user_id IS NULL THEN
    RAISE EXCEPTION 'Candidate not found';
  END IF;

  -- Payment gate: must be paid or later
  IF _candidate_status NOT IN ('paid', 'credential_completed', 'active_marketing', 'placed') THEN
    RAISE EXCEPTION 'Credential intake requires paid status';
  END IF;

  -- Authorization: candidate, assigned recruiter, or admin
  _is_admin := has_role(_caller_id, 'admin');
  _is_assigned := EXISTS (
    SELECT 1 FROM candidate_assignments
    WHERE candidate_id = _candidate_id
      AND recruiter_id = _caller_id
      AND is_active = true
  );

  IF NOT (_caller_id = _candidate_user_id OR _is_assigned OR _is_admin) THEN
    RAISE EXCEPTION 'Unauthorized';
  END IF;

  -- Validate required fields
  IF _form_data->>'full_legal_name' IS NULL OR length(trim(_form_data->>'full_legal_name')) = 0 THEN
    RAISE EXCEPTION 'Full legal name is required';
  END IF;
  IF length(_form_data->>'full_legal_name') > 255 THEN RAISE EXCEPTION 'Full legal name too long'; END IF;
  IF _form_data->>'email' IS NOT NULL AND length(_form_data->>'email') > 255 THEN RAISE EXCEPTION 'Email too long'; END IF;
  IF _form_data->>'phone' IS NOT NULL AND length(_form_data->>'phone') > 50 THEN RAISE EXCEPTION 'Phone too long'; END IF;
  IF _form_data->>'linkedin_url' IS NOT NULL AND length(_form_data->>'linkedin_url') > 0
     AND _form_data->>'linkedin_url' !~ '^https?://' THEN
    RAISE EXCEPTION 'LinkedIn URL must start with http:// or https://';
  END IF;

  -- Get current version and data for diff
  SELECT COALESCE(MAX(version), 0), data INTO _current_version, _old_data
  FROM credential_intake_sheets
  WHERE candidate_id = _candidate_id
  ORDER BY version DESC LIMIT 1;

  -- Insert new version
  INSERT INTO credential_intake_sheets (candidate_id, data, edited_by, version)
  VALUES (_candidate_id, _form_data, _caller_id, _current_version + 1)
  RETURNING id INTO _new_id;

  -- Update candidate status to credential_completed if first submission
  IF _candidate_status = 'paid' THEN
    UPDATE candidates SET status = 'credential_completed' WHERE id = _candidate_id;
  END IF;

  -- Audit log with diff
  INSERT INTO audit_logs (actor_id, action, entity_type, entity_id, old_value, new_value)
  VALUES (
    _caller_id,
    CASE WHEN _current_version = 0 THEN 'credential_submitted' ELSE 'credential_updated' END,
    'credential_intake_sheet',
    _candidate_id,
    _old_data,
    _form_data
  );

  -- Notifications
  IF _current_version = 0 THEN
    -- First submission: notify admins
    PERFORM create_system_notification(
      ur.user_id,
      'Credential Intake Submitted',
      'Candidate has submitted their credential intake sheet.',
      '/admin-dashboard/candidates/' || _candidate_id::text
    ) FROM user_roles ur WHERE ur.role = 'admin';
  END IF;

  -- If edited by recruiter/admin, notify candidate
  IF _caller_id != _candidate_user_id THEN
    PERFORM create_system_notification(
      _candidate_user_id,
      'Credential Intake Updated',
      'Your credential intake sheet has been updated by your team.',
      '/candidate-dashboard/credentials'
    );
  END IF;

  RETURN _new_id;
END;
$$;

-- 2. RPC: Admin manage payment
CREATE OR REPLACE FUNCTION public.admin_record_payment(
  _candidate_id uuid,
  _amount numeric,
  _payment_type text DEFAULT 'initial',
  _status text DEFAULT 'completed',
  _notes text DEFAULT ''
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _caller_id uuid := auth.uid();
  _new_id uuid;
  _candidate_status text;
  _candidate_user_id uuid;
BEGIN
  IF NOT has_role(_caller_id, 'admin') THEN
    RAISE EXCEPTION 'Admin only';
  END IF;

  -- Validate
  IF _amount <= 0 THEN RAISE EXCEPTION 'Amount must be positive'; END IF;
  IF _payment_type NOT IN ('initial', 'subscription', 'refund', 'adjustment') THEN
    RAISE EXCEPTION 'Invalid payment type';
  END IF;
  IF _status NOT IN ('completed', 'pending', 'failed', 'refunded') THEN
    RAISE EXCEPTION 'Invalid payment status';
  END IF;
  IF length(_notes) > 1000 THEN RAISE EXCEPTION 'Notes too long'; END IF;

  SELECT status, user_id INTO _candidate_status, _candidate_user_id
  FROM candidates WHERE id = _candidate_id;

  IF _candidate_status IS NULL THEN
    RAISE EXCEPTION 'Candidate not found';
  END IF;

  -- Insert payment record
  INSERT INTO payments (candidate_id, amount, payment_type, status, notes, payment_date)
  VALUES (_candidate_id, _amount, _payment_type, _status, _notes, now())
  RETURNING id INTO _new_id;

  -- If payment completed and candidate is roles_confirmed, advance to paid
  IF _status = 'completed' AND _candidate_status = 'roles_confirmed' THEN
    UPDATE candidates SET status = 'paid' WHERE id = _candidate_id;

    -- Notify candidate
    PERFORM create_system_notification(
      _candidate_user_id,
      'Payment Received',
      'Your payment has been recorded. You can now access the Credential Intake Sheet.',
      '/candidate-dashboard/credentials'
    );
  END IF;

  -- Audit log
  INSERT INTO audit_logs (actor_id, action, entity_type, entity_id, new_value)
  VALUES (_caller_id, 'payment_recorded', 'payment', _candidate_id,
    jsonb_build_object('amount', _amount, 'type', _payment_type, 'status', _status));

  RETURN _new_id;
END;
$$;

-- 3. RPC: Admin toggle candidate status (pause/resume/cancel)
CREATE OR REPLACE FUNCTION public.admin_update_candidate_status(
  _candidate_id uuid,
  _new_status text,
  _reason text DEFAULT ''
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _caller_id uuid := auth.uid();
  _old_status text;
  _candidate_user_id uuid;
BEGIN
  IF NOT has_role(_caller_id, 'admin') THEN
    RAISE EXCEPTION 'Admin only';
  END IF;

  SELECT status, user_id INTO _old_status, _candidate_user_id
  FROM candidates WHERE id = _candidate_id;

  IF _old_status IS NULL THEN
    RAISE EXCEPTION 'Candidate not found';
  END IF;

  -- Validate status is a valid candidate_status enum value
  IF _new_status NOT IN ('lead', 'approved', 'intake_submitted', 'roles_suggested', 'roles_confirmed', 'paid', 'credential_completed', 'active_marketing', 'paused', 'cancelled', 'placed') THEN
    RAISE EXCEPTION 'Invalid status';
  END IF;

  IF length(_reason) > 500 THEN RAISE EXCEPTION 'Reason too long'; END IF;

  UPDATE candidates SET status = _new_status::candidate_status WHERE id = _candidate_id;

  -- Audit log
  INSERT INTO audit_logs (actor_id, action, entity_type, entity_id, old_value, new_value)
  VALUES (_caller_id, 'status_change', 'candidate', _candidate_id,
    jsonb_build_object('status', _old_status),
    jsonb_build_object('status', _new_status, 'reason', _reason));

  -- Notify candidate of significant status changes
  IF _new_status IN ('approved', 'paid', 'paused', 'cancelled', 'active_marketing', 'placed') THEN
    PERFORM create_system_notification(
      _candidate_user_id,
      'Status Updated',
      'Your candidate status has been updated to: ' || replace(_new_status, '_', ' '),
      '/candidate-dashboard'
    );
  END IF;
END;
$$;
