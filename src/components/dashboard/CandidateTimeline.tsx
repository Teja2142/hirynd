import { CheckCircle, Circle } from "lucide-react";

const PIPELINE_STEPS = [
  { key: "lead", label: "Interest Submitted" },
  { key: "approved", label: "Approved" },
  { key: "intake_submitted", label: "Intake Submitted" },
  { key: "roles_suggested", label: "Roles Suggested" },
  { key: "roles_confirmed", label: "Roles Confirmed" },
  { key: "paid", label: "Payment Complete" },
  { key: "credential_completed", label: "Credentials Ready" },
  { key: "active_marketing", label: "Active Marketing" },
  { key: "placed", label: "Placed" },
];

interface CandidateTimelineProps {
  currentStatus: string;
}

const CandidateTimeline = ({ currentStatus }: CandidateTimelineProps) => {
  const currentIndex = PIPELINE_STEPS.findIndex((s) => s.key === currentStatus);
  const isPausedOrCancelled = ["paused", "cancelled"].includes(currentStatus);

  return (
    <div className="rounded-xl border border-border bg-card p-6">
      <h3 className="mb-4 text-lg font-semibold text-card-foreground">Your Journey</h3>
      {isPausedOrCancelled && (
        <div className="mb-4 rounded-lg bg-accent/10 px-4 py-2 text-sm text-accent-foreground">
          Your account is currently <strong>{currentStatus}</strong>.
        </div>
      )}
      <div className="space-y-0">
        {PIPELINE_STEPS.map((step, i) => {
          const isCompleted = i < currentIndex;
          const isCurrent = i === currentIndex;
          return (
            <div key={step.key} className="flex items-start gap-3">
              <div className="flex flex-col items-center">
                {isCompleted ? (
                  <CheckCircle className="h-5 w-5 text-secondary" />
                ) : isCurrent ? (
                  <div className="h-5 w-5 rounded-full border-2 border-secondary bg-secondary/20" />
                ) : (
                  <Circle className="h-5 w-5 text-muted-foreground/40" />
                )}
                {i < PIPELINE_STEPS.length - 1 && (
                  <div className={`h-6 w-0.5 ${isCompleted ? "bg-secondary" : "bg-border"}`} />
                )}
              </div>
              <span className={`text-sm ${isCurrent ? "font-semibold text-card-foreground" : isCompleted ? "text-muted-foreground" : "text-muted-foreground/50"}`}>
                {step.label}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default CandidateTimeline;
