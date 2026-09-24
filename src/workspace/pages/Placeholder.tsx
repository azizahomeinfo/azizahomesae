const Placeholder = ({ title }: { title: string }) => (
  <div className="space-y-4">
    <h2 className="sr-only">{title}</h2>
    <div className="rounded-[var(--radius)] border border-border p-10 text-center text-muted-foreground">
      Coming in the next release.
    </div>
  </div>
);

export default Placeholder;
