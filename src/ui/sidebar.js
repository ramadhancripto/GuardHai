/* ==========================================================================
   GuardHai · ui/sidebar.js
   The app sidebar: open/close, identity and menu entries.
   ========================================================================== */

function toggleSidebar(open) {
   const drawer = document.getElementById('sidebarDrawer');
   const overlay = document.getElementById('sidebarOverlay');
   if (open) {
   drawer.classList.add('open');
        overlay.style.display = 'block';
    } else {
        drawer.classList.remove('open');
        overlay.style.display = 'none';
    }
}

window.toggleSidebar = toggleSidebar;
export { toggleSidebar };
