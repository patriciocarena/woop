import type { Metadata } from "next";
import { periodLabel } from "@/lib/insights/iso-week";
import { AssessmentClient } from "./AssessmentClient";

type Props = { params: Promise<{ period: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { period } = await params;
  return { title: `Assessment ${period} · Woop` };
}

export default async function AssessmentPage({ params }: Props) {
  const { period } = await params;
  const label = periodLabel(period);
  return <AssessmentClient period={period} label={label} />;
}
