import { useListActivity } from "@workspace/api-client-react";
import { PageLoader } from "@/components/ui/spinner";
import { formatDistanceToNow } from "date-fns";

export default function ActivityFeed() {
  const { data: activities, isLoading } = useListActivity({});

  if (isLoading) return <PageLoader />;

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div className="border-b border-white/10 pb-4">
        <h1 className="text-2xl font-display font-bold text-foreground">Global Activity Log</h1>
        <p className="text-sm text-muted-foreground">Audit trail of actions across the suite.</p>
      </div>

      <div className="relative pl-6 border-l border-white/10 space-y-8 pb-10 mt-8">
        {activities?.map((activity, index) => (
          <div key={activity.id} className="relative">
            {/* Timeline Dot */}
            <div className="absolute w-3 h-3 bg-primary rounded-full -left-[30px] top-1.5 shadow-[0_0_10px_rgba(108,92,231,0.8)]" />
            
            <div className="glass-card p-4 rounded-xl">
              <div className="flex items-center gap-2 mb-2">
                <span className="font-medium text-foreground">{activity.user?.name || 'System'}</span>
                <span className="text-muted-foreground text-sm">{activity.action}</span>
                <span className="px-2 py-0.5 bg-white/5 border border-white/10 rounded text-xs font-mono capitalize">
                  {activity.entityType} {activity.entityId ? `#${activity.entityId}` : ''}
                </span>
              </div>
              {activity.details && (
                <p className="text-sm text-muted-foreground bg-black/20 p-2 rounded-lg border border-white/5">
                  {activity.details}
                </p>
              )}
              <div className="text-xs text-muted-foreground mt-3 font-mono">
                {formatDistanceToNow(new Date(activity.createdAt), { addSuffix: true })}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
