import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Monitor, Smartphone, Apple, Download, Terminal, Loader2, AlertCircle, HelpCircle } from "lucide-react";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

interface DownloadAppsSectionProps {
  variant?: "landing" | "post-onboarding";
}

interface GithubAsset {
  name: string;
  browser_download_url: string;
}

interface GithubRelease {
  assets: GithubAsset[];
}

const FALLBACK_RELEASE_URL = "https://github.com/Nimblesam/STOKIVO/releases";

export function DownloadAppsSection({ variant = "landing" }: DownloadAppsSectionProps) {
  const isPostOnboarding = variant === "post-onboarding";
  const [loading, setLoading] = useState(true);
  const [links, setLinks] = useState<{ [key: string]: string }>({});

  useEffect(() => {
    async function fetchLatestRelease() {
      try {
        const response = await fetch(`https://api.github.com/repos/Nimblesam/STOKIVO/releases/latest?t=${Date.now()}`);
        if (!response.ok) throw new Error("Failed to fetch release");
        const data: GithubRelease = await response.json();

        const newLinks: { [key: string]: string } = {};

        // Priority: Exact match for standardized names, then fallback to extension match
        data.assets.forEach(asset => {
          if (asset.name === "Stokivo.dmg") newLinks.macOS = asset.browser_download_url;
          if (asset.name === "Stokivo.exe") newLinks.Windows = asset.browser_download_url;
          if (asset.name === "Stokivo.AppImage") newLinks.Linux = asset.browser_download_url;
          if (asset.name === "Stokivo.apk") newLinks.Android = asset.browser_download_url;
        });

        // Second pass: extensions (only if not already set by exact match)
        data.assets.forEach(asset => {
          if (!newLinks.macOS && asset.name.endsWith(".dmg")) newLinks.macOS = asset.browser_download_url;
          if (!newLinks.Windows && asset.name.endsWith(".exe")) newLinks.Windows = asset.browser_download_url;
          if (!newLinks.Linux && asset.name.endsWith(".AppImage")) newLinks.Linux = asset.browser_download_url;
          if (!newLinks.Android && asset.name.endsWith(".apk")) newLinks.Android = asset.browser_download_url;
        });

        setLinks(newLinks);
      } catch (error) {
        console.error("Error fetching latest release:", error);
      } finally {
        setLoading(false);
      }
    }

    fetchLatestRelease();
  }, []);

  const apps = [
    {
      platform: "macOS",
      cta: "Download for Mac",
      icon: Apple,
      description: "Desktop POS for Mac (Intel & Apple Silicon)",
      fileType: "DMG",
      downloadUrl: links.macOS || FALLBACK_RELEASE_URL,
    },
    {
      platform: "Windows",
      cta: "Download for Windows",
      icon: Monitor,
      description: "Desktop POS for Windows 10/11",
      fileType: "EXE",
      downloadUrl: links.Windows || FALLBACK_RELEASE_URL,
    },
    {
      platform: "Linux",
      cta: "Download for Linux",
      icon: Terminal,
      description: "Desktop POS as portable AppImage",
      fileType: "AppImage",
      downloadUrl: links.Linux || FALLBACK_RELEASE_URL,
    },
    {
      platform: "Android",
      cta: "Download for Android",
      icon: Smartphone,
      description: "Mobile POS for Android phones & tablets",
      fileType: "APK",
      downloadUrl: links.Android || FALLBACK_RELEASE_URL,
    },
  ];

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

      <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">
        {apps.map((app) => (
          <Card key={app.platform} className="overflow-hidden hover:shadow-md transition-shadow">
            <CardContent className="p-5 flex flex-col items-center text-center gap-3">
              <div className="h-14 w-14 rounded-2xl bg-primary/10 flex items-center justify-center relative">
                <app.icon className="h-7 w-7 text-primary" />
                {(app.platform === "macOS" || app.platform === "Windows") && (
                  <div className="absolute -top-1 -right-1">
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <button className="h-5 w-5 rounded-full bg-background border shadow-sm flex items-center justify-center hover:bg-muted transition-colors">
                            <HelpCircle className="h-3 w-3 text-muted-foreground" />
                          </button>
                        </TooltipTrigger>
                        <TooltipContent className="max-w-[200px] text-xs">
                          {app.platform === "macOS"
                            ? "If you see 'File Corrupt', Right-Click the app and select 'Open', or go to System Settings > Privacy & Security to allow it."
                            : "Windows may show a SmartScreen warning. Click 'More info' then 'Run anyway' to install."}
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  </div>
                )}
              </div>
              <div>
                <h3 className="font-display font-bold text-foreground text-base">{app.platform}</h3>
                <p className="text-xs text-muted-foreground mt-1">{app.description}</p>
              </div>
              <Button asChild className="w-full gap-2 rounded-full mt-auto" disabled={loading}>
                <a href={app.downloadUrl} rel="noopener noreferrer">
                  {loading ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Fetching...
                    </>
                  ) : (
                    <>
                      <Download className="h-4 w-4" />
                      {app.cta}
                    </>
                  )}
                </a>
              </Button>
              <span className="text-[10px] uppercase tracking-wide text-muted-foreground">{app.fileType}</span>
            </CardContent>
          </Card>
        ))}
      </div>

      {!isPostOnboarding && (
        <div className="mt-8 max-w-2xl mx-auto">
          <Alert className="bg-muted/50 border-none">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle className="text-xs font-bold uppercase tracking-wider">Installation Note</AlertTitle>
            <AlertDescription className="text-[11px] leading-relaxed">
              Stokivo is currently in early access. On <strong>macOS</strong>, if the app is flagged as "damaged", right-click and select <strong>Open</strong> to bypass Gatekeeper. On <strong>Windows</strong>, click <strong>"More info"</strong> and then <strong>"Run anyway"</strong> on the SmartScreen prompt.
            </AlertDescription>
          </Alert>
          <p className="text-xs text-muted-foreground text-center mt-4">
            Desktop and mobile apps are POS-only terminals. All business management is done via the web app.
          </p>
        </div>
      )}
    </div>
  );
}
