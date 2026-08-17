import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { listPermissions, setPermission } from "@/lib/texa.functions";
import { Switch } from "@/components/ui/switch";
import {
  Mic,
  Camera,
  Bell,
  FolderClosed,
  MessageCircle,
  Phone,
  Mail,
  Calendar,
  Globe,
} from "lucide-react";
import { toast } from "sonner";
import { useState, useEffect } from "react";

type PermDef = {
  key: string;
  label: string;
  desc: string;
  icon: React.ComponentType<{ className?: string }>;
  browserCheck?: () => Promise<boolean>;
  available: boolean;
  note?: string;
};

async function requestMic() {
  try {
    const s = await navigator.mediaDevices.getUserMedia({ audio: true });
    s.getTracks().forEach((t) => t.stop());
    return true;
  } catch {
    return false;
  }
}
async function requestCam() {
  try {
    const s = await navigator.mediaDevices.getUserMedia({ video: true });
    s.getTracks().forEach((t) => t.stop());
    return true;
  } catch {
    return false;
  }
}
async function requestNotify() {
  if (!("Notification" in window)) return false;
  const r = await Notification.requestPermission();
  return r === "granted";
}

const PERMS: PermDef[] = [
  { key: "microphone", label: "Microphone", desc: "Voice input & wake word", icon: Mic, browserCheck: requestMic, available: true },
  { key: "camera", label: "Camera", desc: "Vision tasks & scanning", icon: Camera, browserCheck: requestCam, available: true },
  { key: "notifications", label: "Notifications", desc: "Reminders & alerts", icon: Bell, browserCheck: requestNotify, available: true },
  { key: "files", label: "Files", desc: "Read local files", icon: FolderClosed, available: false, note: "Desktop app required" },
  { key: "whatsapp", label: "WhatsApp", desc: "Send messages on your behalf", icon: MessageCircle, available: false, note: "Desktop app required" },
  { key: "calls", label: "Phone calls", desc: "Place & receive calls", icon: Phone, available: false, note: "Desktop app required" },
  { key: "email", label: "Email", desc: "Read & draft emails", icon: Mail, available: false, note: "Connect via integrations" },
  { key: "calendar", label: "Calendar", desc: "View & create events", icon: Calendar, available: false, note: "Connect via integrations" },
  { key: "browser", label: "Browser control", desc: "Open tabs, fill forms", icon: Globe, available: false, note: "Desktop app required" },
];

export function PermissionCenter() {
  const list = useServerFn(listPermissions);
  const setP = useServerFn(setPermission);
  const qc = useQueryClient();
  const { data } = useQuery({ queryKey: ["permissions"], queryFn: () => list() });
  const mut = useMutation({
    mutationFn: (v: { key: string; granted: boolean }) => setP({ data: v }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["permissions"] }),
  });
  const [busy, setBusy] = useState<string | null>(null);
  const [daemonOnline, setDaemonOnline] = useState(false);

  // Poll FastAPI backend to see if desktop automation is available
  useEffect(() => {
    let active = true;
    const checkHealth = async () => {
      try {
        const res = await fetch("http://127.0.0.1:8000/api/health");
        if (res.ok && active) {
          setDaemonOnline(true);
        } else if (active) {
          setDaemonOnline(false);
        }
      } catch {
        if (active) setDaemonOnline(false);
      }
    };
    checkHealth();
    const interval = setInterval(checkHealth, 5000);
    return () => {
      active = false;
      clearInterval(interval);
    };
  }, []);

  const granted = (k: string) => Boolean(data?.find((p) => p.key === k)?.granted);

  const getAvailability = (p: PermDef) => {
    if (p.available) return true;
    // Unlock desktop-specific permissions if local daemon is running
    if (daemonOnline && ["files", "whatsapp", "calls", "browser", "email", "calendar"].includes(p.key)) {
      return true;
    }
    return false;
  };

  async function toggle(p: PermDef) {
    const isAvail = getAvailability(p);
    if (!isAvail) {
      toast.info(`${p.label} — ${p.note}`);
      return;
    }
    if (granted(p.key)) {
      mut.mutate({ key: p.key, granted: false });
      return;
    }
    setBusy(p.key);
    const ok = p.browserCheck ? await p.browserCheck() : true;
    setBusy(null);
    if (!ok) {
      toast.error(`Permission denied for ${p.label}`);
      return;
    }
    mut.mutate({ key: p.key, granted: true });
    toast.success(`${p.label} enabled`);
  }

  return (
    <div className="space-y-2">
      {daemonOnline && (
        <div className="text-[10px] uppercase tracking-wider text-emerald-400 font-semibold px-2 py-1 bg-emerald-500/10 border border-emerald-500/20 rounded-md flex items-center gap-1.5 mb-2">
          <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
          TEXA Desktop Daemon Connected
        </div>
      )}
      {PERMS.map((p) => {
        const Icon = p.icon;
        const on = granted(p.key);
        const isAvail = getAvailability(p);
        return (
          <div
            key={p.key}
            className="glass rounded-xl p-3 flex items-center gap-3"
          >
            <div
              className="h-9 w-9 grid place-items-center rounded-lg"
              style={{
                background: on
                  ? "oklch(0.72 0.22 240 / 0.2)"
                  : "oklch(1 0 0 / 0.04)",
                border: "1px solid oklch(1 0 0 / 0.08)",
              }}
            >
              <Icon className="h-4 w-4 text-[color:var(--color-neon)]" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-sm font-medium flex items-center gap-2">
                {p.label}
                {!isAvail && (
                  <span className="text-[10px] uppercase tracking-wider text-muted-foreground border border-white/10 px-1.5 py-0.5 rounded">
                    Soon
                  </span>
                )}
                {isAvail && !p.available && (
                  <span className="text-[10px] uppercase tracking-wider text-emerald-400 border border-emerald-500/20 px-1.5 py-0.5 rounded bg-emerald-500/5">
                    Desktop
                  </span>
                )}
              </div>
              <div className="text-xs text-muted-foreground truncate">{p.desc}</div>
            </div>
            <Switch
              checked={on}
              disabled={!isAvail || busy === p.key}
              onCheckedChange={() => toggle(p)}
            />
          </div>
        );
      })}
    </div>
  );
}
