-- v_workload: Staff workload rollup
-- Shows each staff member's active service count and unique client count,
-- along with their manager. RLS-enforced via security_invoker.

CREATE OR REPLACE VIEW v_workload WITH (security_invoker = on) AS
  SELECT 
    p.id AS staff_id,
    p.full_name AS staff,
    mgr.full_name AS manager,
    count(*) FILTER (WHERE cs.active) AS touchpoints,
    count(DISTINCT cs.client_id) FILTER (WHERE cs.active) AS client_count
  FROM profiles p
  LEFT JOIN profiles mgr ON mgr.id = p.reporting_manager
  LEFT JOIN client_services cs ON cs.assigned_to = p.id
  GROUP BY p.id, p.full_name, mgr.full_name;
