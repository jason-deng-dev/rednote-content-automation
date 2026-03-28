import XhsMetric from "./ui/xhsMetrics";

export default function Home() {
  return (
    <div className="flex flex-row h-full gap-4">
      <XhsMetric />
      <div className="p-6 text-sm flex-1" style={{backgroundColor: '#111111', border: '1px solid #2A2A2A', color: '#888888'}}>Rakuten — coming soon</div>
      <div className="p-6 text-sm flex-1" style={{backgroundColor: '#111111', border: '1px solid #2A2A2A', color: '#888888'}}>Scraper — coming soon</div>
    </div>
  );
}
