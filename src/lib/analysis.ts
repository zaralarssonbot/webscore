const weaknessPool = [
  "Unclear offer above the fold",
  "Weak call-to-actions throughout the site",
  "Outdated visual impression and design language",
  "Mobile experience needs significant improvement",
  "Low trust visuals — missing testimonials or social proof",
  "Slow page load speed affecting user retention",
  "Navigation structure is confusing for first-time visitors",
  "Content hierarchy lacks focus and clarity",
  "Missing meta descriptions and SEO fundamentals",
  "No clear value proposition visible within 5 seconds",
];

const strengthPool = [
  "Clear contact information and accessibility",
  "Solid basic structure and page organization",
  "Relevant services and offerings listed",
  "Acceptable page performance metrics",
  "Good domain authority for its category",
  "SSL certificate properly configured",
  "Consistent branding across pages",
  "Functional forms and user input handling",
];

function pickRandom<T>(arr: T[], count: number): T[] {
  const shuffled = [...arr].sort(() => Math.random() - 0.5);
  return shuffled.slice(0, count);
}

function generateSummary(score: number, domain: string): string {
  if (score >= 80) {
    return `${domain} performs well overall with a strong foundation. There are still opportunities to refine the user experience and outperform top competitors in your space.`;
  }
  if (score >= 65) {
    return `${domain} is functional but lacks clarity and a strong first impression, which reduces its performance compared to similar companies. Key improvements in design and messaging could significantly boost conversions.`;
  }
  return `${domain} has significant room for improvement. The website struggles with first impressions, clarity, and modern design standards. Addressing these fundamentals should be a top priority.`;
}

function generateOpportunity(score: number): string {
  if (score >= 80) {
    return "Refining your conversion funnel and adding social proof elements can help you outperform the top 10% in your industry.";
  }
  if (score >= 65) {
    return "Improving your homepage clarity and mobile experience can significantly increase trust and conversions. These changes alone could push your score above 80.";
  }
  return "A complete homepage redesign focused on a clear value proposition, modern visuals, and strong CTAs could transform your online presence and dramatically increase lead generation.";
}

export function generateAnalysis(domain: string) {
  const score = Math.floor(Math.random() * 36) + 55; // 55-90

  return {
    score,
    summary: generateSummary(score, domain),
    weaknesses: pickRandom(weaknessPool, score >= 80 ? 3 : 5),
    strengths: pickRandom(strengthPool, score >= 80 ? 5 : 3),
    opportunity: generateOpportunity(score),
  };
}
