/**
 * Extracts the core vendor name from a merchant string.
 * Strips transaction codes, numbers, and location suffixes.
 * 
 * Examples:
 * - "HOPP/O/2511182241 Toronto" → "HOPP"
 * - "AMAZON.CA*AB1CD2EF3" → "AMAZON.CA"
 * - "UBER* TRIP 12345" → "UBER"
 * - "COSTCO WHOLESALE #1234" → "COSTCO"
 */
export function extractVendorName(merchantString: string): string {
  if (!merchantString) return '';
  
  let vendor = merchantString.trim().toUpperCase();
  
  // Split on common separators and take first part
  // Handles: HOPP/O/123, AMAZON*ABC, STORE#123, VENDOR@LOC
  vendor = vendor.split(/[\/\*#@]/)[0].trim();
  
  // Remove trailing numbers and codes
  vendor = vendor.replace(/[\d]+$/, '').trim();
  
  // Take first word to remove location suffixes
  // "COSTCO WHOLESALE" → "COSTCO"
  const words = vendor.split(/\s+/);
  if (words.length > 0) {
    vendor = words[0];
  }
  
  // Clean up any trailing punctuation
  vendor = vendor.replace(/[.\-_]+$/, '');
  
  return vendor;
}
