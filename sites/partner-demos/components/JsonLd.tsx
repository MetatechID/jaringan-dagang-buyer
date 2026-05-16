import { jsonLdHtml } from "@/lib/seo";

/** Renders one or more JSON-LD blocks as <script> tags. */
export function JsonLd({ data }: { data: object | object[] }) {
  const blocks = Array.isArray(data) ? data : [data];
  return (
    <>
      {blocks.map((d, i) => (
        <script
          key={i}
          type="application/ld+json"
          // eslint-disable-next-line react/no-danger
          dangerouslySetInnerHTML={{ __html: jsonLdHtml(d) }}
        />
      ))}
    </>
  );
}
