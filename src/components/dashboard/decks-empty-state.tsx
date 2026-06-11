import Link from "next/link";
import { FolderOpen } from "lucide-react";
import { Button } from "@/components/ui/button";

export function DecksEmptyState() {
  return (
    <div className="py-24 flex flex-col items-center text-center">
      <FolderOpen className="h-12 w-12 text-gray-700 mb-4" />
      <h3 className="text-lg font-medium text-gray-300">No decks yet</h3>
      <p className="text-sm text-gray-500 mt-2">Generate your first proposal to see it here.</p>
      <Link href="/upload" className="mt-6">
        <Button size="sm" variant="secondary">New deck</Button>
      </Link>
    </div>
  );
}
