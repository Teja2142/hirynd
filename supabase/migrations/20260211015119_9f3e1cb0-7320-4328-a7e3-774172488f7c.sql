
-- Allow any authenticated user to insert notifications (notifications are system-level)
DROP POLICY "Admins insert notifications" ON public.notifications;
CREATE POLICY "Authenticated users insert notifications" ON public.notifications
  FOR INSERT TO authenticated
  WITH CHECK (true);
