// Vercel Serverless Function: parse uploaded file content via Gemini (OpenRouter)

const TABLE_PROMPTS = {
  org_chart: {
    context: [
      'You are analyzing a document for an agency operations audit. The user needs to populate an ORG CHART table.',
      'This is for a digital marketing / creative agency. The org chart tracks who reports to whom.',
      '',
      'The uploaded content could be ANYTHING: a messy spreadsheet screenshot, an org chart image, a list of employees in a Word doc, a CSV export from HR software, handwritten notes, or even a paragraph describing the team structure.',
      '',
      'Your job is to INFER the best data for each column using context clues:',
      '- "Name": Full name of the person. Look for proper nouns, email prefixes, signatures, @mentions.',
      '- "Role": Their job title or function. Infer from context if not explicit (e.g., someone managing others is likely a "Director" or "Manager"). Use standard titles when possible.',
      '- "Reports To": Who this person reports to. Infer from hierarchy, indentation, grouping, or context. If unclear, use "" (empty string).',
      '',
      'DEDUPLICATION: If the same person appears multiple times (e.g., in different departments or roles), output them ONCE using their most senior role. Match by first name — if only first names are available, assume the same first name is the same person. For example, if "Toby" appears as "Head of Growth" and also as "Setter/Closer", keep only "Toby - Head of Growth".',
      '',
      'IMPORTANT: Extract EVERY unique person you can identify, even if some fields require guessing. A best guess is better than omitting the row. The user will review and edit after.',
    ].join('\n'),
    example: '{"rows":[{"name":"Jane Smith","role":"CEO","reports_to":""},{"name":"John Doe","role":"Marketing Director","reports_to":"Jane Smith"}]}'
  },
  team_members: {
    context: [
      'You are analyzing a document for an agency operations audit. The user needs to populate a TEAM MEMBERS table.',
      'This is for a digital marketing / creative agency. The table tracks employees, their roles, compensation, and performance.',
      '',
      'The uploaded content could be ANYTHING: a payroll export, a screenshot of a project management tool, an HR spreadsheet, a Word doc listing the team, a PDF org chart, or even informal notes about staff.',
      '',
      'Your job is to INFER the best data for each column using context clues:',
      '- "Team Member": Full name. Look for proper nouns, usernames, email addresses, @mentions.',
      '- "Position": Job title or role. Infer from context (e.g., if someone handles "Google Ads" they are likely a "Paid Media Specialist").',
      '- "Pay": Compensation amount. Could appear as salary, hourly rate, monthly rate, or annual. Normalize to monthly if possible (e.g., "$65,000/yr" becomes "$5,417/mo"). If only a number with no context, keep as-is.',
      '- "Ranking": Performance tier. Map to A/B/C if possible. Look for ratings, scores, performance notes, or any evaluative language. "Top performer" = A, "meets expectations" = B, "needs improvement" = C. If no performance data exists, use "".',
      '',
      'DEDUPLICATION: If the same person appears multiple times (e.g., in different departments, pods, or roles), output them ONCE using their most senior role. Match by first name — if only first names are available, assume the same first name is the same person. For example, if "Toby" appears as "Head of Growth" and also as "Newsletter/Social Media", keep only "Toby - Head of Growth".',
      '',
      'IMPORTANT: Extract EVERY unique person you can identify, even if some fields require guessing. A best guess is better than omitting the row. The user will review and edit after.',
    ].join('\n'),
    example: '{"rows":[{"team_member":"James Rivera","position":"Paid Media Strategist","pay":"$5,500/mo","ranking":"A"},{"team_member":"Sarah Chen","position":"SEO Specialist","pay":"$4,800/mo","ranking":"B"}]}'
  },
  clients: {
    context: [
      'You are analyzing a document for an agency operations audit. The user needs to populate a CLIENT ROSTER table.',
      'This is for a digital marketing / creative agency. The table tracks clients, what services they receive, their monthly revenue, and which team members work on them.',
      '',
      'The uploaded content could be ANYTHING: a CRM export, a screenshot of a project board, an invoicing spreadsheet, a client list in a Word doc, a PDF proposal, or even meeting notes mentioning clients.',
      '',
      'Your job is to INFER the best data for each column using context clues:',
      '- "Client": Company or client name. Look for business names, brand names, project names.',
      '- "Services": What the agency does for them. Look for service descriptions, project types, deliverables. Common services: SEO, PPC/Paid Media, Social Media, Content, Web Design, Email Marketing, Branding. Combine multiples with commas.',
      '- "Avg MRR": Average monthly recurring revenue from this client. Look for dollar amounts, contract values, retainer fees. If annual, divide by 12. If a range, use the midpoint. Format as "$X,XXX".',
      '- "Team Members": Who works on this client. Look for names associated with the client, assigned staff, account managers. List as comma-separated first names or full names.',
      '',
      'DEDUPLICATION: If the same client appears multiple times, output them ONCE with combined/merged information.',
      '',
      'IMPORTANT: Extract EVERY unique client you can identify, even if some fields require guessing. A best guess is better than omitting the row. The user will review and edit after.',
    ].join('\n'),
    example: '{"rows":[{"client":"Acme Corp","services":"SEO, PPC","avg_mrr":"$3,500","team_members":"James, Sarah"},{"client":"Beta Inc","services":"Social Media, Content","avg_mrr":"$2,800","team_members":"Mike"}]}'
  },
  pnl: {
    context: [
      'You are analyzing a document for an agency operations audit. The user needs to populate a PROFIT & LOSS table.',
      'This is for a digital marketing / creative agency. The P&L tracks financial line items across up to 3 years.',
      '',
      'The uploaded content could be ANYTHING: a QuickBooks export, a screenshot of a financial report, a tax return, a bookkeeper spreadsheet, an informal budget doc, or even a paragraph describing revenue and expenses.',
      '',
      'Your job is to INFER the best data for each column using context clues:',
      '- "Line Item": The financial category. Standard P&L items: Revenue, COGS, Gross Profit, Payroll, Contractor Costs, Software/Tools, Rent, Marketing, Insurance, Total Expenses, Net Profit, etc. Use standard accounting names when possible.',
      '- "Year 1" / "Year 2" / "Year 3": Dollar amounts for each year/period. Map the earliest period to Year 1. If only one year of data, put it in Year 1 and leave others as "". Format as "$XXX,XXX".',
      '',
      'IMPORTANT: Extract EVERY line item you can identify, even if some fields require guessing. A best guess is better than omitting the row. The user will review and edit after.',
      'If the data has months or quarters instead of years, aggregate to annual totals if possible, otherwise use the periods as-is.',
    ].join('\n'),
    example: '{"rows":[{"line_item":"Revenue","year1":"$500,000","year2":"$750,000","year3":"$1,000,000"},{"line_item":"Payroll","year1":"$200,000","year2":"$300,000","year3":"$400,000"},{"line_item":"Net Profit","year1":"$120,000","year2":"$180,000","year3":"$250,000"}]}'
  }
};

function buildPrompt(tableType, columns) {
  const meta = TABLE_PROMPTS[tableType] || TABLE_PROMPTS.team_members;
  const colDesc = columns.map(c => `"${c.key}" (${c.label})`).join(', ');

  return {
    system: meta.context,
    user: [
      'Analyze the provided content and extract data to populate a table.',
      'The content may NOT be structured as a table. It could be a screenshot, a document, a spreadsheet, notes, or any format. Use your best judgment to identify and map the relevant information.',
      '',
      `Return a JSON object with a single key "rows" containing an array of objects.`,
      `Each object must have exactly these keys: ${colDesc}.`,
      'If a value is unclear or missing, make your best inference from context. Only use "" if you truly cannot determine or guess a value.',
      'DEDUP RULE: If the same entity (person, client, etc.) appears multiple times, include them ONCE using the most senior or most complete version. Match by first name when only first names are available — same first name = same person.',
      'Do NOT include any explanation, markdown, or code fences. Return raw JSON only.',
      '',
      `Example output: ${meta.example}`
    ].join('\n')
  };
}

function buildMessages(prompt, content, contentType, mimeType) {
  if (contentType === 'base64') {
    return [
      { role: 'system', content: prompt.system },
      {
        role: 'user',
        content: [
          { type: 'image_url', image_url: { url: content } },
          { type: 'text', text: prompt.user }
        ]
      }
    ];
  }

  // Text content (CSV, Excel, Word, plain text)
  return [
    { role: 'system', content: prompt.system },
    {
      role: 'user',
      content: prompt.user + '\n\n--- FILE CONTENT ---\n' + content
    }
  ];
}

function parseJsonResponse(text) {
  // Strip markdown code fences if present
  let cleaned = text.trim();
  if (cleaned.startsWith('```')) {
    cleaned = cleaned.replace(/^```(?:json)?\s*\n?/, '').replace(/\n?```\s*$/, '');
  }
  return JSON.parse(cleaned);
}

module.exports = async function handler(req, res) {
  // CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const apiKey = process.env.OPENROUTER_API_KEY;
  if (!apiKey) {
    console.error('OPENROUTER_API_KEY not set');
    return res.status(500).json({ error: 'Server configuration error' });
  }

  const { content, content_type, mime_type, file_name, table_type, columns } = req.body || {};

  if (!content || !content_type || !table_type || !columns) {
    return res.status(400).json({ error: 'Missing required fields: content, content_type, table_type, columns' });
  }

  const prompt = buildPrompt(table_type, columns);
  const messages = buildMessages(prompt, content, content_type, mime_type);

  try {
    const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
        'HTTP-Referer': 'https://audit.agencyoperators.io',
        'X-Title': 'Agency Operators Audit'
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        temperature: 0.1,
        max_tokens: 4096,
        messages
      })
    });

    if (!response.ok) {
      const errText = await response.text();
      console.error('OpenRouter error:', response.status, errText);
      return res.status(502).json({ error: 'AI service error', detail: `${response.status}: ${errText}` });
    }

    const data = await response.json();
    const rawContent = data.choices?.[0]?.message?.content;

    if (!rawContent) {
      return res.status(502).json({ error: 'Empty response from AI' });
    }

    const parsed = parseJsonResponse(rawContent);

    if (!parsed.rows || !Array.isArray(parsed.rows)) {
      return res.status(502).json({ error: 'AI returned invalid format (missing rows array)' });
    }

    return res.status(200).json({ rows: parsed.rows });
  } catch (error) {
    console.error('Parse file error:', error);

    if (error instanceof SyntaxError) {
      return res.status(502).json({ error: 'AI returned malformed JSON. Try a clearer image or file.' });
    }

    return res.status(500).json({ error: 'Internal server error', detail: error.message });
  }
};
