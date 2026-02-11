import { useEffect, useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import DashboardLayout from "@/components/dashboard/DashboardLayout";
import StatusBadge from "@/components/dashboard/StatusBadge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { LayoutDashboard, Users, ClipboardList, Shield, FileText, DollarSign, UserPlus, Activity } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

const navItems = [
  { label: "Operations", path: "/admin-dashboard", icon: <LayoutDashboard className="h-4 w-4" /> },
  { label: "Candidates", path: "/admin-dashboard/candidates", icon: <Users className="h-4 w-4" /> },
  { label: "Recruiters", path: "/admin-dashboard/recruiters", icon: <UserPlus className="h-4 w-4" /> },
  { label: "Referrals", path: "/admin-dashboard/referrals", icon: <Users className="h-4 w-4" /> },
  { label: "Payments", path: "/admin-dashboard/payments", icon: <DollarSign className="h-4 w-4" /> },
  { label: "Audit Logs", path: "/admin-dashboard/audit", icon: <Shield className="h-4 w-4" /> },
];

const STATUSES = [
  "lead", "approved", "intake_submitted", "roles_suggested", "roles_confirmed",
  "paid", "credential_completed", "active_marketing", "paused", "cancelled", "placed"
];

const AdminDashboard = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [candidates, setCandidates] = useState<any[]>([]);
  const [pipelineCounts, setPipelineCounts] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);

  const fetchData = async () => {
    const { data: cands } = await supabase.from("candidates").select("*");
    if (cands) {
      const userIds = cands.map((c: any) => c.user_id);
      const { data: profiles } = await supabase
        .from("profiles")
        .select("user_id, full_name, email")
        .in("user_id", userIds);

      const merged = cands.map((c: any) => ({
        ...c,
        profile: profiles?.find((p: any) => p.user_id === c.user_id),
      }));
      setCandidates(merged);

      // Pipeline counts
      const counts: Record<string, number> = {};
      STATUSES.forEach((s) => { counts[s] = 0; });
      cands.forEach((c: any) => { counts[c.status] = (counts[c.status] || 0) + 1; });
      setPipelineCounts(counts);
    }
    setLoading(false);
  };

  useEffect(() => { fetchData(); }, []);

  const handleStatusChange = async (candidateId: string, newStatus: string) => {
    const old = candidates.find((c) => c.id === candidateId);
    const { error } = await supabase
      .from("candidates")
      .update({ status: newStatus as any })
      .eq("id", candidateId);

    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } else {
      // Audit log
      await supabase.from("audit_logs").insert({
        actor_id: user!.id,
        action: "status_change",
        entity_type: "candidate",
        entity_id: candidateId,
        old_value: { status: old?.status },
        new_value: { status: newStatus },
      });
      toast({ title: "Status updated" });
      fetchData();
    }
  };

  const pipelineWidgets = [
    { key: "lead", label: "New Leads", icon: <Activity className="h-4 w-4" /> },
    { key: "approved", label: "Approved", icon: <Users className="h-4 w-4" /> },
    { key: "intake_submitted", label: "Intake Pending", icon: <FileText className="h-4 w-4" /> },
    { key: "roles_confirmed", label: "Roles Confirmed", icon: <ClipboardList className="h-4 w-4" /> },
    { key: "paid", label: "Paid", icon: <DollarSign className="h-4 w-4" /> },
    { key: "active_marketing", label: "Active Marketing", icon: <Activity className="h-4 w-4" /> },
    { key: "paused", label: "Paused", icon: <Shield className="h-4 w-4" /> },
    { key: "placed", label: "Placed", icon: <Users className="h-4 w-4" /> },
  ];

  return (
    <DashboardLayout title="Admin Operations" navItems={navItems}>
      {/* Pipeline Widgets */}
      <div className="mb-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {pipelineWidgets.map((w) => (
          <Card key={w.key}>
            <CardContent className="flex items-center gap-4 p-4">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-secondary/10">
                {w.icon}
              </div>
              <div>
                <p className="text-2xl font-bold text-card-foreground">{pipelineCounts[w.key] || 0}</p>
                <p className="text-sm text-muted-foreground">{w.label}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Candidate Table */}
      <Card>
        <CardHeader>
          <CardTitle>All Candidates</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <p className="text-muted-foreground">Loading...</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Change Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {candidates.map((c: any) => (
                  <TableRow key={c.id}>
                    <TableCell className="font-medium">{c.profile?.full_name || "—"}</TableCell>
                    <TableCell>{c.profile?.email || "—"}</TableCell>
                    <TableCell><StatusBadge status={c.status} /></TableCell>
                    <TableCell>
                      <Select value={c.status} onValueChange={(val) => handleStatusChange(c.id, val)}>
                        <SelectTrigger className="w-48"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          {STATUSES.map((s) => (
                            <SelectItem key={s} value={s}>{s.replace(/_/g, " ").replace(/\b\w/g, l => l.toUpperCase())}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </DashboardLayout>
  );
};

export default AdminDashboard;
