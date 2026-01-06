// Main page JavaScript
document.addEventListener('DOMContentLoaded', function() {
    loadProgress();
    loadGeneralNotes();
});

// Load progress from localStorage
function loadProgress() {
    const progress = JSON.parse(localStorage.getItem('domainProgress') || '{}');
    
    // Update progress indicators
    for (let i = 1; i <= 5; i++) {
        const progressText = document.getElementById(`progress-${i}`);
        if (progressText && progress[`domain${i}`]) {
            const domainData = progress[`domain${i}`];
            if (domainData.completed) {
                progressText.textContent = `✓ הושלם - ציון: ${domainData.mainScore}/25`;
                progressText.style.color = '#4CAF50';
                progressText.style.fontWeight = 'bold';
            } else if (domainData.started) {
                progressText.textContent = '🔄 בתהליך חקר';
                progressText.style.color = '#FF9800';
            }
        }
    }
    
    updateSummaryBox();
}

// Update summary box
function updateSummaryBox() {
    const summaryBox = document.getElementById('summaryBox');
    if (!summaryBox) return;
    
    const progress = JSON.parse(localStorage.getItem('domainProgress') || '{}');
    const domains = Object.keys(progress);
    
    if (domains.length === 0) {
        summaryBox.innerHTML = '<p class="empty-state">עדיין לא התחלת לחקור תחומים. לחצי על "חקרו את התחום" כדי להתחיל! 🚀</p>';
        return;
    }
    
    let html = '<div class="progress-summary">';
    html += '<h3>התקדמות החקר שלך:</h3>';
    
    domains.forEach(domainKey => {
        const data = progress[domainKey];
        const domainNum = domainKey.replace('domain', '');
        const domainNames = {
            '1': 'הייטק ליבה',
            '2': 'העצמי והחוסן',
            '3': 'סביבה וקיימות',
            '4': 'חברה וקהילה',
            '5': 'עתיד ויזמות'
        };
        
        html += `<div class="domain-progress-item">`;
        html += `<h4>${domainNames[domainNum]}</h4>`;
        if (data.mainScore) {
            html += `<p>ציון תחום ראשי: ${data.mainScore}/25</p>`;
        }
        if (data.subtopics && Object.keys(data.subtopics).length > 0) {
            html += `<p>תתי-תחומים שנחקרו: ${Object.keys(data.subtopics).length}</p>`;
        }
        html += `</div>`;
    });
    
    html += '</div>';
    summaryBox.innerHTML = html;
}

// Save general notes
function saveGeneralNotes() {
    const notes = document.getElementById('generalNotes').value;
    localStorage.setItem('generalNotes', notes);
    
    const btn = document.querySelector('.save-btn');
    const originalText = btn.textContent;
    btn.textContent = '✓ נשמר!';
    btn.style.background = '#4CAF50';
    
    setTimeout(() => {
        btn.textContent = originalText;
        btn.style.background = '';
    }, 2000);
}

// Load general notes
function loadGeneralNotes() {
    const notes = localStorage.getItem('generalNotes');
    const notesArea = document.getElementById('generalNotes');
    if (notesArea && notes) {
        notesArea.value = notes;
    }
}

// Auto-save notes
const generalNotesArea = document.getElementById('generalNotes');
if (generalNotesArea) {
    let notesTimeout;
    generalNotesArea.addEventListener('input', function() {
        clearTimeout(notesTimeout);
        notesTimeout = setTimeout(() => {
            localStorage.setItem('generalNotes', this.value);
        }, 1000);
    });
}
