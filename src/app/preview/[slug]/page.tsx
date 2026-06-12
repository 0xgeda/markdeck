import { PreviewEditor } from "./preview-editor";

export default async function PreviewPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  return <PreviewEditor slug={slug} />;
}
