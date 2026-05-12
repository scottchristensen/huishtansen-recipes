import { NextRequest, NextResponse } from "next/server";

// Instacart Developer Platform — "Recipe & Shopping List" API.
// Docs: https://docs.instacart.com/developer_platform_api
//
// We POST a structured shopping list and get back a URL the user clicks to
// land in Instacart with the cart pre-populated. Instacart owns checkout +
// delivery — we just hand them the cart.

interface IncomingItem {
  name: string;          // raw ingredient name (e.g. "olive oil")
  display_text: string;  // pre-formatted line ("3 tbsp olive oil")
  quantity?: number;
  unit?: string;
}

interface IncomingBody {
  title: string;
  items: IncomingItem[];
  imageUrl?: string;
  linkbackUrl?: string;
}

const INSTACART_ENDPOINT =
  "https://connect.instacart.com/idp/v1/products/products_link";

export async function POST(req: NextRequest) {
  const apiKey = process.env.INSTACART_API_KEY;
  if (!apiKey) {
    return NextResponse.json(
      { error: "Instacart not configured. Set INSTACART_API_KEY." },
      { status: 503 }
    );
  }

  let body: IncomingBody;
  try {
    body = (await req.json()) as IncomingBody;
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  if (!Array.isArray(body.items) || body.items.length === 0) {
    return NextResponse.json(
      { error: "items[] is required" },
      { status: 400 }
    );
  }

  const line_items = body.items.map((item) => {
    const measurement =
      item.quantity && item.quantity > 0
        ? [
            {
              quantity: item.quantity,
              unit: item.unit || "each",
            },
          ]
        : undefined;
    return {
      name: item.name,
      display_text: item.display_text,
      quantity: item.quantity ?? 1,
      unit: item.unit || "each",
      ...(measurement ? { line_item_measurements: measurement } : {}),
    };
  });

  try {
    const res = await fetch(INSTACART_ENDPOINT, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        title: body.title,
        ...(body.imageUrl ? { image_url: body.imageUrl } : {}),
        link_type: "shopping_list",
        expires_in: 30,
        line_items,
        ...(body.linkbackUrl
          ? {
              landing_page_configuration: {
                partner_linkback_url: body.linkbackUrl,
              },
            }
          : {}),
      }),
    });

    const text = await res.text();
    if (!res.ok) {
      console.error("Instacart API error:", res.status, text);
      return NextResponse.json(
        { error: `Instacart returned ${res.status}: ${text.slice(0, 300)}` },
        { status: 502 }
      );
    }

    const data = JSON.parse(text) as { products_link_url?: string };
    if (!data.products_link_url) {
      return NextResponse.json(
        { error: "Instacart response missing products_link_url" },
        { status: 502 }
      );
    }
    return NextResponse.json({ url: data.products_link_url });
  } catch (e) {
    console.error("Instacart request failed:", e);
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Unknown error" },
      { status: 500 }
    );
  }
}
