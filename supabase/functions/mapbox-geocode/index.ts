// Proxies Mapbox forward geocoding so the public token stays server-side.
// Returns lightweight suggestions for an address autocomplete UI.

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const url = new URL(req.url);
    const q = (url.searchParams.get("q") || "").trim();
    const country = (url.searchParams.get("country") || "").toLowerCase().trim();
    if (!q || q.length < 3) {
      return new Response(JSON.stringify({ suggestions: [] }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const token = Deno.env.get("MAPBOX_PUBLIC_TOKEN");
    if (!token) {
      return new Response(JSON.stringify({ error: "MAPBOX_PUBLIC_TOKEN not configured" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const params = new URLSearchParams({
      access_token: token,
      autocomplete: "true",
      limit: "5",
      types: "address,place,postcode,locality,neighborhood",
    });
    if (country) params.set("country", country);

    const endpoint = `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(q)}.json?${params.toString()}`;
    const res = await fetch(endpoint);
    if (!res.ok) {
      const txt = await res.text();
      return new Response(JSON.stringify({ error: `Mapbox error: ${txt}` }), {
        status: 502,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const data = await res.json();
    const suggestions = (data.features || []).map((f: any) => ({
      id: f.id,
      label: f.place_name as string,
      address: f.place_name as string,
      center: f.center as [number, number],
    }));

    return new Response(JSON.stringify({ suggestions }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: (err as Error).message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
