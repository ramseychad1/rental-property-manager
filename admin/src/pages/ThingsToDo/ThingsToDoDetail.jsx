import { useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  ChevronLeft,
  Pencil,
  Trash2,
  Loader2,
  MapPin,
  Tags,
  FileText,
} from "lucide-react";
import { toast } from "sonner";

import PageHeader from "@/components/common/PageHeader";
import ConfirmDialog from "@/components/common/ConfirmDialog";
import StatusBadge from "@/components/common/StatusBadge";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

import { thingsToDoApi } from "@/lib/api";

const getEmbedUrl = (url) => {
  if (!url) return "";

  const match = url.match(/place\/([^/]+)/);

  if (!match) return "";

  const place = match[1].replaceAll("+", " ");

  return `https://www.google.com/maps?q=${encodeURIComponent(
    place,
  )}&output=embed`;
};

export default function ThingsToDoDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const qc = useQueryClient();

  const [confirmDel, setConfirmDel] = useState(false);
  const [mapLoading, setMapLoading] = useState(true);

  const { data: item, isLoading } = useQuery({
    queryKey: ["things-to-do", id],
    queryFn: () => thingsToDoApi.get(id),
    enabled: !!id,
  });

  const remove = useMutation({
    mutationFn: () => thingsToDoApi.remove(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["things-to-do"] });
      toast.success("Thing to do deleted successfully");
      navigate("/things-to-do");
    },
    onError: (e) => {
      toast.error(e?.normalizedMessage || "Failed to delete");
    },
  });

  if (isLoading) {
    return (
      <div className="grid place-items-center min-h-[60vh]">
        <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!item) {
    return (
      <div className="space-y-4">
        <PageHeader title="Thing to do not found" />
        <Button asChild>
          <Link to="/things-to-do">Back to Things To Do</Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title={item.name}
        breadcrumb={
          <Link
            to="/things-to-do"
            className="hover:text-foreground flex items-center"
          >
            <ChevronLeft className="w-4 h-4" />
            Back to Things To Do
          </Link>
        }
        actions={
          <div className="flex gap-2">
            <Button
              variant="outline"
              onClick={() => navigate(`/things-to-do/${id}/edit`)}
            >
              <Pencil className="w-4 h-4" /> Edit
            </Button>

            <Button variant="destructive" onClick={() => setConfirmDel(true)}>
              <Trash2 className="w-4 h-4" /> Delete
            </Button>
          </div>
        }
      />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        <div className="lg:col-span-2 space-y-5">
          <Card className="rounded-xl overflow-hidden">
            <div className="aspect-[16/9] bg-muted">
              <img
                src={item.image}
                alt={item.name}
                className="w-full h-full object-cover"
              />
            </div>
          </Card>

          <Card className="p-6 rounded-xl">
            <div className="flex items-center gap-2 mb-3">
              <FileText className="w-4 h-4 text-muted-foreground" />
              <span className="overline">Description</span>
            </div>

            <p className="text-sm leading-relaxed text-muted-foreground">
              {item.description}
            </p>
          </Card>
        </div>

        <div className="space-y-5">
          <Card className="p-4 rounded-xl space-y-4">
            <div className="flex items-center justify-between">
              <span className="overline">Status</span>
              <StatusBadge status={item.status} />
            </div>

            <div className="border-t border-border pt-4 space-y-4">
              <div>
                <div className="text-xs text-muted-foreground">Category</div>
                <div className="mt-2 flex items-center gap-2">
                  <Tags className="w-4 h-4 text-muted-foreground" />
                  <Badge variant="outline" className="text-xs font-mono">
                    {item.category}
                  </Badge>
                </div>
              </div>

              <div>
                <div className="text-xs text-muted-foreground">Area</div>
                <div className="mt-2 flex items-center gap-2 text-sm font-medium">
                  <MapPin className="w-4 h-4 text-muted-foreground" />
                  {item.area}
                </div>
              </div>
            </div>
          </Card>

          <Card className="p-4 rounded-xl space-y-3">
            <span className="overline">Address</span>

            <div className="flex items-start gap-2">
              <MapPin className="w-4 h-4 mt-0.5 text-muted-foreground" />

              <div className="text-sm font-mono break-words">
                {item.location?.address || "No address added"}
              </div>
            </div>
          </Card>

          <Card className="p-4 rounded-xl space-y-3">
            <span className="overline">Location on Map</span>

            <div className="relative w-full h-[360px] rounded-lg overflow-hidden bg-muted">
              {mapLoading && (
                <div className="absolute inset-0 z-10 animate-pulse bg-muted flex items-center justify-center">
                  <div className="text-center">
                    <div className="mx-auto mb-3 h-10 w-10 rounded-full border-4 border-foreground border-t-transparent animate-spin" />
                    <p className="text-sm text-muted-foreground">
                      Loading map...
                    </p>
                  </div>
                </div>
              )}

              {item.location?.url ? (
                <iframe
                  title={`Map of ${item.location.address}`}
                  className="w-full h-full border-0"
                  src={getEmbedUrl(item.location.url)}
                  loading="lazy"
                  allowFullScreen
                  referrerPolicy="no-referrer-when-downgrade"
                  onLoad={() => setMapLoading(false)}
                />
              ) : (
                <div className="h-full flex items-center justify-center text-center text-muted-foreground space-y-2">
                  <div>
                    <MapPin className="mx-auto w-6 h-6" />
                    <p className="mt-2 text-sm">Map location not available</p>
                  </div>
                </div>
              )}
            </div>
          </Card>
        </div>
      </div>

      <ConfirmDialog
        open={confirmDel}
        onOpenChange={setConfirmDel}
        title="Delete this thing to do?"
        description={`"${item.name}" will be permanently removed.`}
        destructive
        confirmLabel="Delete"
        onConfirm={() => remove.mutate()}
      />
    </div>
  );
}
