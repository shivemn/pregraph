/** A role title mid-sentence: "Data analyst" becomes "data analyst", but "AI engineer" and "iOS developer" stay. */
export function midSentence(title: string): string {
  return /^.[A-Z]/.test(title) ? title : title.charAt(0).toLowerCase() + title.slice(1);
}
