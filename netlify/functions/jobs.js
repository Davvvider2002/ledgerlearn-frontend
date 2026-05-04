/**
 * LedgerLearn Pro — Jobs Feed Function
 * ======================================
 * File: netlify/functions/jobs.js
 *
 * Fetches live job vacancies from free RSS/XML feeds.
 * Filters by accounting software keywords.
 * Caches for 2 hours to avoid hammering feeds.
 * No API keys required — all free sources.
 *
 * Endpoint: GET /.netlify/functions/jobs
 * Optional:  GET /.netlify/functions/jobs?q=xero&limit=8
 */

// ── In-memory cache (persists for the lifetime of the function instance) ──
let cache = { data: null, ts: 0 };
const CACHE_TTL = 2 * 60 * 60 * 1000; // 2 hours

// ── Keywords to filter jobs by ────────────────────────────
const KEYWORDS = [
  'xero', 'quickbooks', 'quick books', 'sage', 'netsuite', 'myob',
  'bookkeeper', 'bookkeeping', 'erp', 'accounts payable', 'accounts receivable',
  'accounting software', 'cloud accounting', 'payroll software',
  'financial controller', 'management accountant', 'accounts assistant',
];

// ── Free RSS/XML job feeds ────────────────────────────────
// These are public RSS feeds — no authentication required
const FEEDS = [
  {
    name: 'Reed',
    url: 'https://www.reed.co.uk/api/1.0/search?keywords=xero+quickbooks+sage+bookkeeper&resultsToTake=20&format=rss',
    type: 'rss',
  },
  {
    name: 'Indeed UK',
    url: 'https://www.indeed.co.uk/rss?q=xero+OR+quickbooks+OR+sage+bookkeeper&l=&sort=date&limit=20',
    type: 'rss',
  },
  {
    name: 'Indeed US',
    url: 'https://www.indeed.com/rss?q=xero+OR+quickbooks+accounting&sort=date&limit=20',
    type: 'rss',
  },
  {
    name: 'Adzuna UK',
    url: 'https://api.adzuna.com/v1/api/jobs/gb/search/1?app_id=00000000&app_key=00000000&results_per_page=20&what=xero+quickbooks+sage&content-type=application/json',
    type: 'json_adzuna',
    // Note: Replace 00000000 with real Adzuna keys when upgrading
    // Free tier: 250 calls/month at adzuna.com/api
    skip_if_no_key: true,
  },
  {
    name: 'CV-Library',
    url: 'https://www.cv-library.co.uk/feed/jobs?q=xero+quickbooks+sage+bookkeeper&t=rss',
    type: 'rss',
  },
  {
    name: 'Totaljobs',
    url: 'https://www.totaljobs.com/Feeds/JobFeed.ashx?Keywords=xero+quickbooks+bookkeeper&format=rss',
    type: 'rss',
  },
];

// ── Fallback jobs (shown when all feeds fail) ─────────────
const FALLBACK_JOBS = [
  { title: 'Xero Bookkeeper', company: 'Various Clients', location: 'Remote / UK', salary: '£28,000–£35,000', url: 'https://www.reed.co.uk/jobs/xero-bookkeeper', source: 'Reed', posted: 'Recently', badge: 'xero' },
  { title: 'QuickBooks Accountant', company: 'Accounting Firm', location: 'Remote / US', salary: '$45,000–$58,000', url: 'https://www.indeed.com/jobs?q=quickbooks+accountant', source: 'Indeed', posted: 'Recently', badge: 'qb' },
  { title: 'Xero Implementation Consultant', company: 'ERP Consultancy', location: 'London / Remote', salary: '£40,000–£55,000', url: 'https://www.reed.co.uk/jobs/xero-consultant', source: 'Reed', posted: 'Recently', badge: 'xero' },
  { title: 'Sage 50 Accounts Assistant', company: 'SME Business', location: 'Birmingham, UK', salary: '£24,000–£30,000', url: 'https://www.reed.co.uk/jobs/sage-accounts', source: 'Reed', posted: 'Recently', badge: 'sage' },
  { title: 'Cloud Accounting Manager', company: 'Accounting Practice', location: 'Remote / Hybrid', salary: '£45,000–£60,000', url: 'https://www.reed.co.uk/jobs/cloud-accounting', source: 'Reed', posted: 'Recently', badge: 'xero' },
  { title: 'QuickBooks Pro Advisor', company: 'CPA Firm', location: 'New York, US / Remote', salary: '$55,000–$70,000', url: 'https://www.indeed.com/jobs?q=quickbooks+pro+advisor', source: 'Indeed', posted: 'Recently', badge: 'qb' },
  { title: 'Finance Systems Analyst (Xero)', company: 'Tech Startup', location: 'Remote', salary: '£38,000–£48,000', url: 'https://www.reed.co.uk/jobs/finance-systems', source: 'Reed', posted: 'Recently', badge: 'xero' },
  { title: 'Bookkeeper — Xero / QuickBooks', company: 'Multiple Clients', location: 'Philippines / Remote', salary: '$600–$1,200/mo', url: 'https://www.onlinejobs.ph/jobseekers/job-search?jobkeyword=xero', source: 'OnlineJobs.ph', posted: 'Recently', badge: 'qb' },
];

// ── Parse RSS XML ─────────────────────────────────────────
function parseRSS(xml, sourceName) {
  const jobs = [];
  try {
    // Extract <item> blocks
    const items = xml.match(/<item[\s>][\s\S]*?<\/item>/gi) || [];
    for (const item of items.slice(0, 15)) {
      const get = (tag) => {
        const m = item.match(new RegExp(`<${tag}[^>]*><!\\[CDATA\\[([\\s\\S]*?)\\]\\]><\\/${tag}>`, 'i'))
               || item.match(new RegExp(`<${tag}[^>]*>([^<]*)<\\/${tag}>`, 'i'));
        return m ? m[1].trim() : '';
      };

      const title    = get('title').replace(/&amp;/g,'&').replace(/&lt;/g,'<').replace(/&gt;/g,'>');
      const link     = get('link') || get('guid');
      const desc     = get('description').toLowerCase();
      const pubDate  = get('pubDate') || get('dc:date') || '';
      const location = get('location') || get('georss:point') || extractLocation(desc) || 'See listing';
      const salary   = extractSalary(get('description')) || extractSalary(title) || '';
      const company  = get('author') || get('dc:creator') || extractCompany(get('description')) || sourceName;

      // Keyword filter
      const fullText = (title + ' ' + desc).toLowerCase();
      const matched  = KEYWORDS.some(kw => fullText.includes(kw));
      if (!matched || !title || !link) continue;

      jobs.push({
        title:    cleanText(title),
        company:  cleanText(company),
        location: cleanText(location),
        salary:   salary,
        url:      link,
        source:   sourceName,
        posted:   formatDate(pubDate),
        badge:    detectBadge(title + ' ' + desc),
      });
    }
  } catch (e) {
    console.error(`[jobs] RSS parse error (${sourceName}):`, e.message);
  }
  return jobs;
}

// ── Detect software badge ─────────────────────────────────
function detectBadge(text) {
  const t = text.toLowerCase();
  if (t.includes('xero'))                        return 'xero';
  if (t.includes('quickbooks') || t.includes('quick books')) return 'qb';
  if (t.includes('sage'))                        return 'sage';
  if (t.includes('netsuite'))                    return 'netsuite';
  return 'general';
}

// ── Extract salary from description text ─────────────────
function extractSalary(text) {
  if (!text) return '';
  // Match patterns like £25,000, $45k, €35,000 - €45,000, 30000-40000
  const m = text.match(/[£$€]\s*[\d,]+(?:k|\.\d+)?(?:\s*[-–to]+\s*[£$€]?\s*[\d,]+k?)?(?:\s*(?:per\s+(?:year|annum|pa|yr)|\/?(?:yr|pa|annum)?))?/i)
         || text.match(/[\d,]+(?:k)?\s*[-–]\s*[\d,]+(?:k)?\s*(?:per\s+(?:year|annum)|p\.a\.?)/i);
  return m ? m[0].trim().replace(/\s+/g,' ') : '';
}

// ── Extract location from description ────────────────────
function extractLocation(text) {
  const patterns = [
    /(?:location|based in|located in)[:\s]+([A-Z][a-zA-Z\s,]+?)(?:\.|<|$)/i,
    /\b(London|Manchester|Birmingham|Leeds|Edinburgh|Remote|Hybrid|New York|Philippines|Lagos|Johannesburg)\b/i,
  ];
  for (const p of patterns) {
    const m = text.match(p);
    if (m) return m[1].trim();
  }
  return '';
}

// ── Extract company from description ─────────────────────
function extractCompany(text) {
  const m = text?.match(/(?:company|employer|client)[:\s]+([A-Z][a-zA-Z\s&,\.]+?)(?:\.|<|\n|$)/i);
  return m ? m[1].trim().substring(0,40) : '';
}

// ── Clean HTML tags from text ─────────────────────────────
function cleanText(text) {
  return (text || '').replace(/<[^>]+>/g,'').replace(/&amp;/g,'&').replace(/&nbsp;/g,' ').replace(/\s+/g,' ').trim().substring(0,80);
}

// ── Format posted date ────────────────────────────────────
function formatDate(dateStr) {
  if (!dateStr) return 'Recently';
  try {
    const d = new Date(dateStr);
    const diff = Math.floor((Date.now() - d) / (1000*60*60*24));
    if (diff === 0) return 'Today';
    if (diff === 1) return 'Yesterday';
    if (diff < 7)   return `${diff} days ago`;
    if (diff < 14)  return '1 week ago';
    if (diff < 30)  return `${Math.floor(diff/7)} weeks ago`;
    return 'Recently';
  } catch { return 'Recently'; }
}

// ── Deduplicate by title+company ─────────────────────────
function dedupe(jobs) {
  const seen = new Set();
  return jobs.filter(j => {
    const key = (j.title + j.company).toLowerCase().replace(/\s+/g,'');
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

// ── Main handler ──────────────────────────────────────────
exports.handler = async function (event) {
  const headers = {
    'Access-Control-Allow-Origin':  '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Content-Type': 'application/json',
    'Cache-Control': 'public, max-age=3600',
  };

  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers, body: '' };
  }

  const params  = event.queryStringParameters || {};
  const limit   = Math.min(parseInt(params.limit || '10', 10), 20);
  const query   = (params.q || '').toLowerCase();

  // Serve from cache if fresh
  if (cache.data && (Date.now() - cache.ts) < CACHE_TTL) {
    console.log('[jobs] Serving from cache');
    let jobs = cache.data;
    if (query) jobs = jobs.filter(j => (j.title+j.badge+j.company).toLowerCase().includes(query));
    return {
      statusCode: 200, headers,
      body: JSON.stringify({ ok: true, jobs: jobs.slice(0, limit), cached: true, total: jobs.length }),
    };
  }

  // Fetch all feeds in parallel
  const allJobs = [];
  const fetchPromises = FEEDS
    .filter(f => !f.skip_if_no_key)
    .map(async (feed) => {
      try {
        const res = await fetch(feed.url, {
          headers: { 'User-Agent': 'LedgerLearn Job Aggregator/1.0' },
          signal: AbortSignal.timeout(5000),
        });
        if (!res.ok) return;

        if (feed.type === 'rss') {
          const xml  = await res.text();
          const jobs = parseRSS(xml, feed.name);
          allJobs.push(...jobs);
          console.log(`[jobs] ${feed.name}: ${jobs.length} jobs`);
        }
      } catch (e) {
        console.warn(`[jobs] Feed failed (${feed.name}):`, e.message);
      }
    });

  await Promise.allSettled(fetchPromises);

  // If we got real jobs, use them; otherwise fallback
  let finalJobs = dedupe(allJobs);
  const usedFallback = finalJobs.length < 3;

  if (usedFallback) {
    console.log('[jobs] Using fallback jobs (feeds returned < 3 results)');
    finalJobs = FALLBACK_JOBS;
  }

  // Sort: most recent first, then by keyword relevance
  finalJobs.sort((a, b) => {
    const aScore = ['xero','qb','sage'].includes(a.badge) ? 1 : 0;
    const bScore = ['xero','qb','sage'].includes(b.badge) ? 1 : 0;
    return bScore - aScore;
  });

  // Cache the result
  cache = { data: finalJobs, ts: Date.now() };

  let jobs = finalJobs;
  if (query) jobs = jobs.filter(j => (j.title+j.badge+j.company).toLowerCase().includes(query));

  return {
    statusCode: 200, headers,
    body: JSON.stringify({
      ok: true,
      jobs: jobs.slice(0, limit),
      cached: false,
      total: finalJobs.length,
      fallback: usedFallback,
    }),
  };
};
