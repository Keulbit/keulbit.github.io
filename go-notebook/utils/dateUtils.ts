
export function timeAgo(dateString: string | undefined): string {
  if (!dateString) return 'Date unknown';
  
  const date = new Date(dateString);
  // Check if date is valid
  if (isNaN(date.getTime())) {
    return 'Invalid date';
  }

  const now = new Date();
  const seconds = Math.round((now.getTime() - date.getTime()) / 1000);
  
  if (seconds < 5) return `just now`; // More natural for very recent
  if (seconds < 60) return `${seconds} sec ago`;

  const minutes = Math.round(seconds / 60);
  if (minutes < 60) return `${minutes} min ago`;

  const hours = Math.round(minutes / 60);
  if (hours < 24) return `${hours} hours ago`;

  const days = Math.round(hours / 24);
  if (days === 1) return `yesterday`; // More natural
  if (days < 7) return `${days} days ago`;

  // For older dates, show month and day, or full date
  const optionsShort: Intl.DateTimeFormatOptions = { month: 'short', day: 'numeric' };
  if (now.getFullYear() === date.getFullYear()) {
    return date.toLocaleDateString(undefined, optionsShort);
  } else {
    const optionsFull: Intl.DateTimeFormatOptions = { year: 'numeric', month: 'short', day: 'numeric' };
    return date.toLocaleDateString(undefined, optionsFull);
  }
}
