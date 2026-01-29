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
        
        try {
            const response = await fetch('/api/research', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ query: query })
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.detail || 'Research initialization failed');
            }

            const data = await response.json();

            // Handle response format
            // Assuming the API returns something like: { output_value: "markdown text", ... }
            // or { content: [ { text: "..." } ] }
            // Adjust based on actual API response structure.
            // Based on user snippet: "Print response.text" -> likely a JSON with chat response.
            
            let markdownText = "No content returned.";
            
            // Heuristic to extract text from various possible response formats
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

            // Render Markdown
            resultsContent.innerHTML = marked.parse(markdownText);
            resultsSection.classList.remove('hidden');

            // Scroll to results
            resultsSection.scrollIntoView({ behavior: 'smooth', block: 'start' });

        } catch (error) {
            resultsContent.innerHTML = `<div style="color: #f87171; background: rgba(220, 38, 38, 0.1); padding: 1rem; border-radius: 8px;">
                <strong>Error:</strong> ${error.message}
            </div>`;
            resultsSection.classList.remove('hidden');
        } finally {
            // UI State: Ready
            searchBtn.disabled = false;
            queryInput.disabled = false;
            btnText.classList.remove('hidden');
            loader.classList.add('hidden');
        }
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
