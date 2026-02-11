
-- Fix overly permissive INSERT policies

-- Audit logs: only authenticated users can insert, and actor_id must match
DROP POLICY "System inserts audit logs" ON public.audit_logs;
CREATE POLICY "Authenticated users insert audit logs" ON public.audit_logs
  FOR INSERT TO authenticated
  WITH CHECK (actor_id = auth.uid() OR public.has_role(auth.uid(), 'admin'));

-- Notifications: only admins or system can insert
DROP POLICY "System inserts notifications" ON public.notifications;
CREATE POLICY "Admins insert notifications" ON public.notifications
  FOR INSERT TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'admin'));
