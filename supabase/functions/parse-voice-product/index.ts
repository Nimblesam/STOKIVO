import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { transcript, isRestaurant } = await req.json();
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY not configured");

    const systemPrompt = isRestaurant
      ? `You extract product details from voice input for a restaurant POS. Extract: name, category, selling_price (number only, no currency), cost_price (optional). Return ONLY a JSON object with a "product" key.`
      : `You extract product details from voice input for a retail/wholesale POS. Extract: name, sku (if mentioned), category, cost_price (number only), selling_price (number only), stock_qty (number), unit_type (one of: unit, carton, bag, kg, bottle, tin). Return ONLY a JSON object with a "product" key.`;

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: `Parse this voice input into product fields: "${transcript}"` },
        ],
        tools: [
          {
            type: "function",
            function: {
              name: "extract_product",
              description: "Extract product fields from voice transcript",
              parameters: {
                type: "object",
                properties: {
                  product: {
                    type: "object",
                    properties: {
                      name: { type: "string" },
                      sku: { type: "string" },
                      category: { type: "string" },
                      cost_price: { type: "string" },
                      selling_price: { type: "string" },
                      stock_qty: { type: "string" },
                      unit_type: { type: "string" },
                    },
                    required: ["name"],
                  },
                },
                required: ["product"],
              },
            },
          },
        ],
        tool_choice: { type: "function", function: { name: "extract_product" } },
      }),
    });

    if (!response.ok) {
      const status = response.status;
      if (status === 429) {
        return new Response(JSON.stringify({ error: "Rate limited, please try again shortly." }), {
          status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (status === 402) {
        return new Response(JSON.stringify({ error: "AI credits exhausted. Please add funds." }), {
          status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      throw new Error(`AI gateway error: ${status}`);
    }

    const data = await response.json();
    const toolCall = data.choices?.[0]?.message?.tool_calls?.[0];
    if (toolCall?.function?.arguments) {
      const parsed = JSON.parse(toolCall.function.arguments);
      return new Response(JSON.stringify(parsed), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ error: "Could not parse product" }), {
      status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("parse-voice-product error:", e);
    return new Response(JSON.stringify({ error: e.message }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
