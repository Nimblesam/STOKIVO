import { render, screen, waitFor } from "@testing-library/react";
import { DownloadAppsSection } from "./DownloadAppsSection";
import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock fetch
const mockFetch = vi.fn();
global.fetch = mockFetch;

describe("DownloadAppsSection", () => {
  beforeEach(() => {
    mockFetch.mockReset();
  });

  it("should show 'Fetching...' initially and then display download links", async () => {
    const mockData = {
      assets: [
        { name: "Stokivo.dmg", browser_download_url: "https://github.com/test/Stokivo.dmg" },
        { name: "Stokivo.exe", browser_download_url: "https://github.com/test/Stokivo.exe" },
        { name: "Stokivo.AppImage", browser_download_url: "https://github.com/test/Stokivo.AppImage" },
        { name: "Stokivo.apk", browser_download_url: "https://github.com/test/Stokivo.apk" },
      ],
    };

    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => mockData,
    });

    render(<DownloadAppsSection />);

    // Initially should show Fetching...
    expect(screen.getAllByText(/Fetching.../i)).toHaveLength(4);

    await waitFor(() => {
      expect(screen.queryByText(/Fetching.../i)).not.toBeInTheDocument();
    });

    const downloadLinks = screen.getAllByRole("link");
    expect(downloadLinks).toHaveLength(4);

    const hrefs = downloadLinks.map((link) => link.getAttribute("href"));
    expect(hrefs).toContain("https://github.com/test/Stokivo.dmg");
    expect(hrefs).toContain("https://github.com/test/Stokivo.exe");
    expect(hrefs).toContain("https://github.com/test/Stokivo.AppImage");
    expect(hrefs).toContain("https://github.com/test/Stokivo.apk");
  });

  it("should use fallback URL on fetch failure", async () => {
    mockFetch.mockRejectedValueOnce(new Error("API Error"));

    render(<DownloadAppsSection />);

    await waitFor(() => {
      expect(screen.queryByText(/Fetching.../i)).not.toBeInTheDocument();
    });

    const downloadLinks = screen.getAllByRole("link");
    const FALLBACK_URL = "https://github.com/Nimblesam/STOKIVO/releases";

    downloadLinks.forEach(link => {
      expect(link.getAttribute("href")).toBe(FALLBACK_URL);
    });
  });
});
