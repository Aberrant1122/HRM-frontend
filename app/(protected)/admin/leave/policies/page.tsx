import { LeaveTypeManager } from "@/components/leave/leave-type-manager";

export default function AdminLeavePoliciesPage() {
    return (
        <div className="container mx-auto py-10 px-4">
            <div className="mb-10">
                <h1 className="text-3xl font-extrabold text-gray-900 tracking-tight mb-2">Leave Configuration</h1>
                <p className="text-gray-500">
                    Create and maintain live leave categories. Configure allowances in explicitly assigned employee policies.
                </p>
            </div>

            <div className="max-w-5xl">
                <LeaveTypeManager />
            </div>
        </div>
    );
}
