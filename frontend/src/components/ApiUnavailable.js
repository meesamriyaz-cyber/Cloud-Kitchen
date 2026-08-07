import React from "react";
import { AlertCircle, RefreshCcw } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function ApiUnavailable({ title = "Kitchen data is unavailable", message, onRetry }) {
  return (
    <div className="rounded-2xl border border-amber-200 bg-amber-50 p-6 text-amber-900">
      <div className="flex items-start gap-3">
        <div className="mt-0.5 rounded-full bg-amber-100 p-2">
          <AlertCircle size={18} />
        </div>
        <div className="min-w-0 flex-1">
          <h2 className="font-display text-lg font-semibold">{title}</h2>
          <p className="mt-1 text-sm text-amber-800">
            {message || "The API is running, but the database is not connected. Check backend/.env MUKHTAR_KITCHEN__MONGO_URI or start MongoDB, then retry."}
          </p>
          {onRetry && (
            <Button type="button" variant="outline" className="mt-4 rounded-full bg-white" onClick={onRetry}>
              <RefreshCcw size={15} className="mr-2" /> Retry
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
