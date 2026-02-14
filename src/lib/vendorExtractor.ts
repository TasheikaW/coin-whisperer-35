/**
 * Extracts the core vendor name from a merchant string.
 * Strips transaction codes, numbers, and location suffixes
 * while preserving multi-word merchant names.
 * 
 * Examples:
 * - "AMZN Mktp CA*PP4JO4NX3" → "AMZN Mktp"
 * - "HOPP/O/2511182241 Toronto" → "HOPP"
 * - "UBER CANADA/UBERTRIP TORONTO" → "UBER CANADA"
 * - "LYFT   *RIDE TUE 3PM VANCOUVER" → "LYFT"
 * - "SP FASHIONNOVA.COM FASHIONNOVA.C" → "SP FASHIONNOVA.COM"
 * - "COSTCO WHOLESALE #1234" → "COSTCO WHOLESALE"
 * - "FREEDOM MOBILE 877-946-3184" → "FREEDOM MOBILE"
 */
export function extractVendorName(merchantString: string): string {
  if (!merchantString) return '';
  
  let vendor = merchantString.trim();
  
  // Strip currency symbols (J$, US$, A$, $, etc.)
  vendor = vendor.replace(/[A-Z]{0,3}\$/g, '').trim();
  
  // Split on common separators and take first part
  // Handles: HOPP/O/123, AMAZON*ABC, STORE#123, VENDOR@LOC
  vendor = vendor.split(/[\/\*#@]/)[0].trim();
  
  // Remove trailing standalone numbers/codes (e.g., "877-946-3184", "1234")
  vendor = vendor.replace(/\s+[\d][\d\-]{3,}$/, '').trim();
  
  // Remove trailing words that are 2-letter state/province codes (CA, ON, etc.)
  const words = vendor.split(/\s+/).filter(w => w.length > 0);
  while (words.length > 1 && /^[A-Za-z]{2}$/.test(words[words.length - 1])) {
    words.pop();
  }
  
  vendor = words.join(' ');
  
  // Clean up any trailing punctuation
  vendor = vendor.replace(/[.\-_]+$/, '');
  
  return vendor;
}
