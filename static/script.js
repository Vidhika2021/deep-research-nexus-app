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

    function resetUI() {
        searchBtn.disabled = false;
        queryInput.disabled = false;
        btnText.classList.remove('hidden');
        loader.classList.add('hidden');
    }

    searchBtn.addEventListener('click', performResearch);

    queryInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            performResearch();
        }
    });

    copyBtn.addEventListener('click', () => {
        const text = resultsContent.innerText;
        navigator.clipboard.writeText(text).then(() => {
            copyBtn.textContent = 'Copied!';
            setTimeout(() => {
                copyBtn.textContent = 'Copy';
            }, 2000);
        });
    });
});
