/* ==========================================================================
   GuardHai · engines/navigation/tabs.js
   Bottom navigation and screen switching shared by every screen.
   ========================================================================== */
import { initMainMap } from '../../features/map/map-view.js';

function switchTab(tabName) {
   document.querySelectorAll('.page-container').forEach(p => p.classList.remove('active'));
   document.querySelectorAll('.nav-tab-btn').forEach(b => b.classList.remove('active'));

    const selectedPage = document.getElementById(tabName + 'Page');
    const selectedTab = document.getElementById('tab-' + tabName);

    if (selectedPage) selectedPage.classList.add('active');
    if (selectedTab) selectedTab.classList.add('active');

    if (tabName === 'map') setTimeout(initMainMap, 200);
}

window.switchTab = switchTab;
export { switchTab };
