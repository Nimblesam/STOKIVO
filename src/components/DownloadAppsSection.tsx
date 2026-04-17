import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Monitor, Smartphone, Apple, Download, Terminal } from "lucide-react";

interface DownloadAppsSectionProps {
  variant?: "landing" | "post-onboarding";
}

const RELEASE_BASE = "https://github.com/Nimblesam/wholesale-hub/releases/latest/download";

const apps = [
  {
    platform: "macOS",
    cta: "Download for Mac",
    icon: Apple,
    description: "Desktop POS for Mac (Intel & Apple Silicon)",
    fileType: "DMG",
    downloadUrl: `${RELEASE_BASE}/Stokivo-0.0.2.dmg`,
    available: true,
  },
  {
    platform: "Windows",
    cta: "Download for Windows",
    icon: Monitor,
    description: "Desktop POS for Windows 10/11",
    fileType: "EXE",
    downloadUrl: `${RELEASE_BASE}/Stokivo-0.0.2.exe`,
    available: true,
  },
  {
    platform: "Linux",
    cta: "Download for Linux",
    icon: Terminal,
    description: "Desktop POS as portable AppImage",
    fileType: "AppImage",
    downloadUrl: `${RELEASE_BASE}/Stokivo-0.0.2.AppImage`,
    available: true,
  },
  {
    platform: "Android",
    cta: "Download for Android",
    icon: Smartphone,
    description: "Mobile POS for Android phones & tablets",
    fileType: "APK",
    downloadUrl: `${RELEASE_BASE}/Stokivo-0.0.2.apk`,
    available: true,
  },
];

export function DownloadAppsSection({ variant = "landing" }: DownloadAppsSectionProps) {
  const isPostOnboarding = variant === "post-onboarding";

  return (
    <div className={isPostOnboarding ? "space-y-6" : ""}>
      {isPostOnboarding && (
        <div className="text-center">
          <div className="flex justify-center gap-2 mb-3">
            <Monitor className="h-7 w-7 text-primary" />
            <Smartphone className="h-7 w-7 text-primary" />
          </div>
          <h2 className="text-xl font-display font-bold text-foreground">Download Stokivo Apps</h2>
          <p className="text-sm text-muted-foreground mt-1 max-w-md mx-auto">
            Install the POS app on your devices to start selling. Your account is already set up — just log in and go.
          </p>
        </div>
      )}

      <div className={`grid gap-4 ${isPostOnboarding ? "grid-cols-1 sm:grid-cols-3" : "grid-cols-1 md:grid-cols-3"}`}>
        {apps.map((app) => (
          <Card key={app.platform} className="overflow-hidden hover:shadow-md transition-shadow">
            <CardContent className="p-5 flex flex-col items-center text-center gap-3">
              <div className="h-14 w-14 rounded-2xl bg-primary/10 flex items-center justify-center">
                <app.icon className="h-7 w-7 text-primary" />
              </div>
              <div>
                <h3 className="font-display font-bold text-foreground text-base">{app.platform}</h3>
                <p className="text-xs text-muted-foreground mt-1">{app.description}</p>
              </div>
              <Button
                className="w-full gap-2 rounded-full mt-auto"
                variant={app.available ? "default" : "outline"}
                disabled={!app.available}
                onClick={() => {
                  if (app.downloadUrl !== "#") {
                    window.open(app.downloadUrl, "_blank");
                  }
                }}
              >
                <Download className="h-4 w-4" />
                {app.available ? `Download ${app.fileType}` : "Coming Soon"}
              </Button>
            </CardContent>
          </Card>
        ))}
      </div>

      {!isPostOnboarding && (
        <p className="text-xs text-muted-foreground text-center mt-4">
          Desktop and mobile apps are POS-only terminals. All business management is done via the web app.
        </p>
      )}
    </div>
  );
}
