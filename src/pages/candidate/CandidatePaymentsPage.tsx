import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import DashboardLayout from "@/components/dashboard/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { DollarSign, FileText, Clock, CheckCircle, XCircle } from "lucide-react";

const CANDIDATE_NAV = [
  { label: "Overview", path: "/candidate-dashboard", icon: <span className="h-4 w-4">📋</span> },
  { label: "Intake Form", path: "/candidate-dashboard/intake", icon: <FileText className="h-4 w-4" /> },
  { label: "Roles", path: "/candidate-dashboard/roles", icon: <span className="h-4 w-4">💼</span> },
  { label: "Credentials", path: "/candidate-dashboard/credentials", icon: <span className="h-4 w-4">🔑</span> },
  { label: "Payments", path: "/candidate-dashboard/payments", icon: <DollarSign className="h-4 w-4" /> },
];

interface CandidatePaymentsPageProps {
  candidate: any;
}

const CandidatePaymentsPage = ({ candidate }: CandidatePaymentsPageProps) => {
  const [payments, setPayments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!candidate) return;
    const fetch = async () => {
      const { data } = await supabase
        .from("payments")
        .select("*")
        .eq("candidate_id", candidate.id)
        .order("created_at", { ascending: false });
      setPayments(data || []);
      setLoading(false);
    };
    fetch();
  }, [candidate]);

  const statusIcon = (status: string) => {
    switch (status) {
      case "completed": return <CheckCircle className="h-4 w-4 text-secondary" />;
      case "failed": return <XCircle className="h-4 w-4 text-destructive" />;
      default: return <Clock className="h-4 w-4 text-muted-foreground" />;
    }
  };

  return (
    <DashboardLayout title="Payment History" navItems={CANDIDATE_NAV}>
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2"><DollarSign className="h-5 w-5" /> Payment Timeline</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <p className="text-muted-foreground">Loading...</p>
          ) : payments.length === 0 ? (
            <p className="text-muted-foreground">No payments recorded yet. Your team will update this once payment is received.</p>
          ) : (
            <div className="space-y-4">
              {payments.map((p: any) => (
                <div key={p.id} className="flex items-start gap-4 rounded-xl border border-border p-4">
                  <div className="mt-0.5">{statusIcon(p.status)}</div>
                  <div className="flex-1">
                    <div className="flex items-center justify-between">
                      <p className="font-semibold text-card-foreground">
                        ${Number(p.amount).toLocaleString()} {p.currency}
                      </p>
                      <span className="text-xs capitalize text-muted-foreground">{p.status}</span>
                    </div>
                    <p className="text-sm text-muted-foreground capitalize">{p.payment_type.replace(/_/g, " ")}</p>
                    {p.notes && <p className="mt-1 text-sm text-muted-foreground">{p.notes}</p>}
                    <p className="mt-1 text-xs text-muted-foreground">
                      {p.payment_date ? new Date(p.payment_date).toLocaleDateString() : new Date(p.created_at).toLocaleDateString()}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </DashboardLayout>
  );
};

export default CandidatePaymentsPage;
