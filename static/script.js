document.addEventListener('DOMContentLoaded', () => {
    const searchBtn = document.getElementById('searchBtn');
    const queryInput = document.getElementById('queryInput');
    const resultsSection = document.getElementById('resultsSection');
    const resultsContent = document.getElementById('resultsContent');
    const btnText = document.querySelector('.btn-text');
    const loader = document.querySelector('.loader');
    const copyBtn = document.getElementById('copyBtn');

    async function performResearch() {
        const query = queryInput.value.trim();
        if (!query) return;

        // UI State: Loading
        searchBtn.disabled = true;
        queryInput.disabled = true;
        btnText.classList.add('hidden');
        loader.classList.remove('hidden');
        resultsSection.classList.add('hidden');
        resultsContent.innerHTML = ''; // Clear previous results
        
        try {
            // 1. Start the research job
            const startResponse = await fetch('/api/research', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ query: query })
            });

            if (!startResponse.ok) {
                const errorData = await startResponse.json();
                throw new Error(errorData.detail || 'Failed to start research');
            }

            const { job_id } = await startResponse.json();
            
            // 2. Poll for results
            const pollInterval = 3000; // 3 seconds
            let attempts = 0;
            const maxAttempts = 300; // ~15 mins max
            
            const poll = async () => {
                if (attempts++ > maxAttempts) {
                    throw new Error('Research timed out. please try again later.');
                }

                const statusResponse = await fetch(`/api/research/${job_id}`);
                if (!statusResponse.ok) {
                     // If 404 or 500, maybe retry a few times, or fail
                    throw new Error('Error checking research status');
                }

                const job = await statusResponse.json();

                if (job.status === 'completed') {
                    displayResults(job.result);
                } else if (job.status === 'failed') {
                    throw new Error(job.error || 'Research task failed');
                } else {
                     // Still processing or queued
                     // Optional: Update UI with "Processing... (Attempt X)"
                    setTimeout(poll, pollInterval);
                }
            };
            
            // Start polling
            poll();

        } catch (error) {
            handleError(error);
        }
    }

    function displayResults(data) {
        let markdownText = "No content returned.";
        
        // Flexible parsing logic
        if (typeof data === 'string') {
            markdownText = data;
        } else if (data.output_value) {
            markdownText = data.output_value;
        } else if (data.response && Array.isArray(data.response) && data.response.length > 0 && data.response[0].message) {
            markdownText = data.response[0].message;
        } else if (data.content && Array.isArray(data.content)) {
            markdownText = data.content.map(c => c.text || '').join('\n');
        } else if (data.text) { 
            markdownText = data.text;
        } else {
            markdownText = JSON.stringify(data, null, 2);
        }

        resultsContent.innerHTML = marked.parse(markdownText);
        resultsSection.classList.remove('hidden');
        resultsSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
        
        resetUI();
    }

    function handleError(error) {
        resultsContent.innerHTML = `<div style="color: #f87171; background: rgba(220, 38, 38, 0.1); padding: 1rem; border-radius: 8px;">
            <strong>Error:</strong> ${error.message}
        </div>`;
        resultsSection.classList.remove('hidden');
        resetUI();
    }

    function autoResizeTextarea() {
        queryInput.style.height = 'auto';
        queryInput.style.height = (queryInput.scrollHeight) + 'px';
    }

    function resetUI() {
        searchBtn.disabled = false;
        queryInput.disabled = false;
        btnText.classList.remove('hidden');
        loader.classList.add('hidden');
        autoResizeTextarea();
    }

    searchBtn.addEventListener('click', performResearch);

    queryInput.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            performResearch();
        }
    });

    queryInput.addEventListener('input', autoResizeTextarea);

    copyBtn.addEventListener('click', () => {
        const text = resultsContent.innerText;
        navigator.clipboard.writeText(text).then(() => {
            copyBtn.textContent = 'Copied!';
            setTimeout(() => {
                copyBtn.textContent = 'Copy';
            }, 2000);
        });
    });

    // Prompt templates definitions
    const templates = {
        1: `Search the web extensively. You are an IBM consultant building an executive-ready account briefing on [Account Name] using credible public sources from the last 12 months. Prioritize primary sources (investor relations, annual reports, regulatory filings, press releases) over secondary (news, analyst coverage).
Deliver these sections, citing sources in Title format at the end of each:
1. Executive Summary – 10 bold-keyed bullets covering current corporate and financial standing.
2. Top 5 Takeaways for Account Teams – Boxed format, key phrases in bold, actionable for an IBM seller.
3. Company Snapshot – Legal entity, parent company, HQ, geographies, industry, core business, ownership structure, ticker, headcount, revenue scale, and links to latest annual report/filings.
4. Financial Performance – Markdown table of revenue, profit, and margins (2020–2026). Second markdown table showing share price trend vs. major competitors over the same period, followed by brief competitive performance commentary.
5. Sources – Grouped by type: company reports, investor relations, filings, regulatory, news.
Be thorough — run as many searches as needed to fill every section with specific, sourced detail. Do not leave sections incomplete or ask me for input.`,
        2: `Search the web extensively. You are an IBM consultant building an outside-in strategy and leadership brief on <Account>using credible public sources from the last 12 months. Prioritize primary sources (investor relations, annual reports, ASX filings, press releases) over secondary (news, analyst coverage).
Deliver these sections, citing sources in Title format at the end of each:
1. Management Priorities – Telstra's financial targets (current year + 5-year outlook) and strategic objectives for the next 5 years (e.g. T25/T30 strategy pillars).
2. Key Challenges – Markdown table: Challenge | Description | Business Impact | Likely Executive Owner | Evidence.
3. Leadership Team Profiles – Markdown table: Name | Role & Tenure | Personal Agenda | Business Agenda. Then for the top 3 executives, provide detailed sub-sections covering: previous roles, known IBM or competitor vendor connections, and LinkedIn profile links.
4. Sources – Grouped by type: company reports, filings, press releases, news.
Be thorough — run as many searches as needed to fill every section with specific, sourced detail. Do not leave sections incomplete or ask me for input.`,
        3: `Search the web extensively. You are an IBM consultant building an outside-in sales intelligence brief on Westpac using credible public sources from the last 12 months. Prioritize primary sources (investor relations, annual reports, ASX filings, press releases) over secondary (news, analyst coverage).
Deliver these sections, citing sources in Title format at the end of each:
1. Industry & Competitive Context – Top 5 Australian banking trends, consumer behaviour shifts, disruptive technologies, innovation leaders, biggest competitive threats, notable M&A/partnerships.
2. IT/Digital Initiatives – Markdown table: Initiative | Description | Business Objective | Evidence | Likely Owner. Only publicly documented initiatives.
3. IT/Partner Landscape – Markdown table: Vendor | Support Area | Business Area | Evidence | Confidence (High/Med/Low).
4. Sales & Differentiated Intelligence – IBM whitespace opportunities, business triggers, transformation themes, exec vs. IT messaging angles, discovery hypotheses, recent exec quotes or cyber incidents.
5. Sources – Grouped by type: company releases, regulatory/investor, industry/analyst, news, vendor/partner.
Be thorough — run as many searches as needed to fill every section with specific, sourced detail. Do not leave sections incomplete or ask me for input.`
    };

    // Setup Template Cards Interaction
    document.querySelectorAll('.prompt-card').forEach(card => {
        const index = card.getAttribute('data-index');
        const useBtn = card.querySelector('.use-btn');
        const copyBtnSmall = card.querySelector('.copy-btn-small');
        const templateText = templates[index];

        if (useBtn) {
            useBtn.addEventListener('click', () => {
                queryInput.value = templateText;
                autoResizeTextarea();
                queryInput.focus();
                
                // Highlight placeholder so user can change name immediately
                let targetText = '[Account Name]';
                let startPos = templateText.indexOf(targetText);
                if (startPos === -1) {
                    targetText = '<Account>';
                    startPos = templateText.indexOf(targetText);
                }
                if (startPos === -1) {
                    targetText = 'Westpac';
                    startPos = templateText.indexOf(targetText);
                }
                
                if (startPos !== -1) {
                    queryInput.setSelectionRange(startPos, startPos + targetText.length);
                } else {
                    queryInput.setSelectionRange(0, 0);
                }

                // Smooth scroll to search box
                queryInput.scrollIntoView({ behavior: 'smooth', block: 'center' });
            });
        }

        if (copyBtnSmall) {
            copyBtnSmall.addEventListener('click', () => {
                navigator.clipboard.writeText(templateText).then(() => {
                    const originalText = copyBtnSmall.textContent;
                    copyBtnSmall.textContent = 'Copied!';
                    copyBtnSmall.style.borderColor = 'var(--accent-color)';
                    copyBtnSmall.style.color = '#fff';
                    setTimeout(() => {
                        copyBtnSmall.textContent = originalText;
                        copyBtnSmall.style.borderColor = '';
                        copyBtnSmall.style.color = '';
                    }, 2000);
                });
            });
        }
    });
});
