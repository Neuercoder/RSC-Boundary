import { Button } from "../components/button";

interface PageProps {
  params: Promise<{ slug: string }>;
}

export default async function Page({ params }: PageProps) {
  const { slug } = await params;
  const heading = `Article: ${slug}`;
  return (
    <main>
      <h1>{heading}</h1>
      <Button label="Share" />
    </main>
  );
}
