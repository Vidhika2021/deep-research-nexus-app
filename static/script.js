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
        1: `You are an IBM consultant seeking an outside-in view of <Account Name>. Using only credible public sources from the last 12 months, prepare an executive-ready account briefing covering the following sections. Cite source links in [Title](URL) format at the bottom of every section. Prefer primary sources first (company website, annual reports, investor materials, regulatory filings, press releases).
Sections:
1. Executive Summary – 10-bullet summary of Telstra's current corporate and financial standing, with key terms in bold.
2. Top 5 Takeaways – A "Top 5 Takeaways for Account Teams" box with key points in bold.
3. Company Snapshot – Legal entity, parent, HQ, geographies, industry, core business, ownership, ticker, links to annual reports/filings, headcount, and revenue scale.
4. Financial Performance – Provide a markdown table of revenue, profit, and margins for the years 2020–2026. Provide a second table showing the share price trend vs. major competitors over time, followed by competitive performance commentary.
Sources – Grouped by type (company reports, IR, filings, regulatory, news).`,
        2: `You are an IBM consultant seeking an outside-in view of Telstra. Using only credible public sources from the last 12 months, prepare an executive-ready briefing covering the following sections. Cite source links in [Title](URL) format at the bottom of every section. Prefer primary sources first (company website, annual reports, investor materials, regulatory filings, press releases).
Sections:
1. Management Priorities – Telstra's financial goals for the current year and next 5 years, and overall strategic objectives for the next 5 years.
2. Key Challenges – Provide a 5-column markdown table: Challenge | Description | Business Impact | Likely Executive Owner | Evidence.
3. Leadership Team Profiles – Provide a 4-column markdown table: Name | Role & Tenure | Personal Agenda | Business Agenda. Then, include detailed per-person sub-sections for the top 3 executives covering their previous roles, known IBM or competitor connections, and their LinkedIn links.
Sources – Grouped by type (company reports, filings, press releases, news).`,
        3: `You are an IBM consultant seeking an outside-in view of <Account Name>. Using only credible public sources from the last 12 months, prepare an executive-ready sales intelligence report covering the following sections. Cite source links in [Title](URL) format at the bottom of every section. Prefer primary sources first (company website, annual reports, investor materials, regulatory filings, press releases).
Sections:
1. Industry & Competitive Context – Top 5 trends, consumer behaviour shifts (last 12–24 months), disruptive technologies, innovation leaders, biggest competitive threats, and notable M&A/partnerships.
2. IT/Digital Initiatives – Provide a 5-column markdown table: Initiative | Description | Business Objective | Evidence | Likely Owner (only for publicly documented initiatives).
3. IT/Partner Landscape – Provide a 5-column markdown table: Vendor | Support Area | Business Area | Evidence | Confidence (High/Med/Low).
4. Sales & Differentiated Intelligence – IBM interest/whitespace, business triggers, transformation themes, exec vs. IT messaging, discovery hypotheses, and recent announcements, executive quotes, or cyber incidents.
Sources – Grouped by type (partner/vendor, industry, news, company releases).`
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
                let targetText = '<Account Name>';
                let startPos = templateText.indexOf(targetText);
                if (startPos === -1) {
                    targetText = 'Telstra';
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
