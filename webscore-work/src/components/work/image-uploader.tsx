"use client";

import { useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { uploadAttachment } from "@/lib/actions";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { attachmentCategoryLabels } from "@/lib/status";
import { EmptyState } from "@/components/shared/empty-state";
import { Camera, ImageIcon, Loader2 } from "lucide-react";
import { formatDate } from "@/lib/utils";

interface AttachmentView {
  id: string;
  url: string;
  fileName: string;
  category: string;
  comment?: string;
  uploadedBy: string;
  createdAt: string;
}

const MAX = 4 * 1024 * 1024; // 4 MB

export function ImageUploader({
  workOrderId,
  projectId,
  attachments,
}: {
  workOrderId?: string;
  projectId?: string;
  attachments: AttachmentView[];
}) {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const [category, setCategory] = useState("during");
  const [pending, start] = useTransition();

  const onFiles = (files: FileList | null) => {
    if (!files?.length) return;
    const file = files[0];
    if (!file.type.startsWith("image/"))
      return toast.error("Endast bildfiler tillåts");
    if (file.size > MAX) return toast.error("Bilden är för stor (max 4 MB)");
    start(async () => {
      const fd = new FormData();
      fd.set("file", file);
      fd.set("category", category);
      if (workOrderId) fd.set("workOrderId", workOrderId);
      if (projectId) fd.set("projectId", projectId);
      const res = await uploadAttachment(fd);
      if (res.ok) {
        toast.success("Bild uppladdad");
        router.refresh();
      } else toast.error(res.error);
    });
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        <Select value={category} onValueChange={setCategory}>
          <SelectTrigger className="w-44">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {Object.entries(attachmentCategoryLabels).map(([k, label]) => (
              <SelectItem key={k} value={k}>
                {label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <input
          ref={inputRef}
          type="file"
          accept="image/*"
          capture="environment"
          className="hidden"
          onChange={(e) => onFiles(e.target.files)}
        />
        <Button
          variant="outline"
          onClick={() => inputRef.current?.click()}
          disabled={pending}
        >
          {pending ? (
            <Loader2 className="size-4 animate-spin" />
          ) : (
            <Camera className="size-4" />
          )}
          Ladda upp bild
        </Button>
      </div>

      {attachments.length === 0 ? (
        <EmptyState
          icon={ImageIcon}
          title="Inga bilder ännu"
          description="Dokumentera arbetet med foton — före, under och efter."
        />
      ) : (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4">
          {attachments.map((a) => (
            <div
              key={a.id}
              className="group overflow-hidden rounded-lg border border-border bg-muted"
            >
              <div className="relative aspect-square">
                {a.url ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={a.url}
                    alt={a.fileName}
                    className="size-full object-cover"
                  />
                ) : (
                  <div className="flex size-full items-center justify-center text-muted-foreground">
                    <ImageIcon className="size-8" />
                  </div>
                )}
                <Badge variant="violet" className="absolute left-2 top-2">
                  {attachmentCategoryLabels[a.category] ?? a.category}
                </Badge>
              </div>
              <div className="p-2">
                <p className="truncate text-xs font-medium">{a.fileName}</p>
                <p className="text-[11px] text-muted-foreground">
                  {formatDate(a.createdAt)}
                </p>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
