"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";

export function DeleteProject({ id }: { id: string }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");
  async function remove() {
    setPending(true); setError("");
    try {
      const response = await fetch(`/api/projects/${id}`, { method: "DELETE", headers: { "Content-Type": "application/json" } });
      if (!response.ok) throw new Error("Unable to delete this project. Try again.");
      router.push("/dashboard"); router.refresh();
    } catch { setError("Unable to delete this project. Try again."); setPending(false); }
  }
  return <><Button variant="ghost" size="sm" onClick={() => setOpen(true)}><Trash2 />Delete project</Button>{open && <dialog ref={(node) => { if (node && !node.open) node.showModal(); }} aria-labelledby="delete-title" onCancel={(event) => { event.preventDefault(); if (!pending) setOpen(false); }}><h2 id="delete-title">Delete this project?</h2><p>This will permanently remove this project and its saved brief.</p>{error && <p className="error-text" role="alert">{error}</p>}<div className="modal-actions"><Button variant="outline" disabled={pending} onClick={() => setOpen(false)} autoFocus>Cancel</Button><Button variant="destructive" disabled={pending} onClick={remove}>{pending ? "Deleting…" : "Delete permanently"}</Button></div></dialog>}</>;
}
