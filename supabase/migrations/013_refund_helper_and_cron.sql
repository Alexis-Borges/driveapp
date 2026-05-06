-- ============================================================
-- DriveApp - Migration 013 : RPC helper refund + cron récurrence
-- ============================================================

-- RPC : décrémente les heures payées d'un élève après un refund
-- (utilisé par admin-refund edge function)
CREATE OR REPLACE FUNCTION refund_student_hours(p_student_id UUID, p_hours INT)
RETURNS VOID AS $$
BEGIN
  UPDATE students
     SET package_total_hours = GREATEST(0, package_total_hours - p_hours)
   WHERE id = p_student_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Cron : génération créneaux récurrents — chaque dimanche 23:00
SELECT cron.unschedule(jobid) FROM cron.job
  WHERE jobname = 'driveapp-generate-recurring-slots';

SELECT cron.schedule(
  'driveapp-generate-recurring-slots',
  '0 23 * * 0',
  $$SELECT call_edge_function('generate-recurring-slots')$$
);
