/**
 * Notification Service
 * Handles automatic reporting and email simulation for critical tyre wear.
 */
class NotificationService {
    constructor() {
        this.STORAGE_KEY = 'tyre_pulse_notifications';
    }

    /**
     * Checks all vehicles in the fleet for critical wear and sends reports if needed.
     */
    async checkFleet() {
        const vehicles = await window.dbService.getVehicles();
        vehicles.forEach(v => this.checkVehicle(v));
    }

    /**
     * Checks a specific vehicle for critical wear.
     * @param {Object} vehicle 
     */
    checkVehicle(vehicle) {
        if (!vehicle) return;

        const currentOdo = vehicle.currentOdometer || 0;
        const criticalTyres = [];

        Object.values(vehicle.tyres).forEach(t => {
            let wear = t.wear || 0;
            // Recalculate if possible for accuracy
            if (t.installationKm !== undefined && t.expectedLifeKm) {
                const driven = Math.max(0, currentOdo - t.installationKm);
                wear = (driven / t.expectedLifeKm) * 100;
            }

            if (wear >= 70) {
                criticalTyres.push({
                    position: t.position,
                    wear: Math.round(wear),
                    brand: t.brand
                });
            }
        });

        if (criticalTyres.length > 0) {
            this.triggerAlert(vehicle, criticalTyres);
        }
    }

    /**
     * Triggers the alert workflow (UI Notification + Email Simulation).
     */
    triggerAlert(vehicle, tyres) {
        const user = window.authService.getUser();
        const email = user ? user.email : 'user@example.com';
        const notificationId = `${vehicle.id}_${new Date().toLocaleDateString()}`;

        // Prevent spamming the same alert multiple times per day
        if (this.isNotified(notificationId)) {
            console.log(`Alert already sent today for ${vehicle.name}`);
            return;
        }

        // 1. Show UI Toast/Modal
        this.showNotificationUI(`Critical Wear Detected: ${vehicle.name}`, `Generating report for ${tyres.length} tyres...`);

        // 2. Simulate Email Sending
        setTimeout(() => {
            this.sendEmail(email, vehicle, tyres);
            this.markNotified(notificationId);
        }, 1500);
    }

    sendEmail(to, vehicle, tyres) {
        console.log(`Sending email to ${to}...`);

        const tyreList = tyres.map(t => `- ${t.position}: ${t.wear}% worn (${t.brand})`).join('\n');
        const subject = `URGENT: Tyre Change Required for ${vehicle.name}`;
        const body = `Dear User,\n\nOur analysis detected critical wear on the following tyres for your vehicle ${vehicle.name} (${vehicle.plate}):\n\n${tyreList}\n\nPlease verify and change these tyres immediately to ensure safety.\n\nRegards,\nTyre Pulse Team`;

        // UI Feedback
        // this.showNotificationUI('Email Sent Successfully ✅', `Report sent to ${to}`);

        // Optional: Open Mail Client (User experience choice - usually annoying if auto, better if manual click)
        // window.open(`mailto:${to}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`);
    }

    isNotified(id) {
        const logs = JSON.parse(localStorage.getItem(this.STORAGE_KEY) || '[]');
        return logs.includes(id);
    }

    markNotified(id) {
        const logs = JSON.parse(localStorage.getItem(this.STORAGE_KEY) || '[]');
        logs.push(id);
        // Keep only last 50 logs
        if (logs.length > 50) logs.shift();
        localStorage.setItem(this.STORAGE_KEY, JSON.stringify(logs));
    }

    showNotificationUI(title, message) {
        // Create a Bootstrap Toast container if not exists
        let container = document.getElementById('toast-container');
        if (!container) {
            container = document.createElement('div');
            container.id = 'toast-container';
            container.className = 'toast-container position-fixed bottom-0 end-0 p-3';
            container.style.zIndex = '1055';
            document.body.appendChild(container);
        }

        const toastHtml = `
            <div class="toast align-items-center text-white bg-danger border-0 show" role="alert" aria-live="assertive" aria-atomic="true">
                <div class="d-flex">
                    <div class="toast-body">
                        <strong>${title}</strong><br>
                        ${message}
                    </div>
                    <button type="button" class="btn-close btn-close-white me-2 m-auto" data-bs-dismiss="toast" aria-label="Close"></button>
                </div>
            </div>
        `;

        // Append and auto-remove
        const wrapper = document.createElement('div');
        wrapper.innerHTML = toastHtml;
        const toastEl = wrapper.firstElementChild;
        container.appendChild(toastEl);

        setTimeout(() => {
            toastEl.remove();
        }, 5000);
    }
}

window.notificationService = new NotificationService();
