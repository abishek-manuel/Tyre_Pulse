/**
 * Database Service
 * Handles data operations for Vehicles, Tyres, Blogs, and Maintenance using Firestore.
 * ALL methods are now ASYNCHRONOUS.
 */

class DBService {
    constructor() {
        this.db = null;
        // db is initialized in config.js and attached to window.firebaseDb
    }

    get dbInstance() {
        if (!window.firebaseDb) {
            if (typeof firebase !== 'undefined') {
                return firebase.firestore();
            }
            throw new Error("Firestore not initialized");
        }
        return window.firebaseDb;
    }

    get userId() {
        const user = window.authService.getUser();
        if (!user) {
            throw new Error("User not authenticated");
        }
        return user.uid;
    }

    // --- Vehicle Operations ---

    async getVehicles() {
        if (window.APP_CONFIG && window.APP_CONFIG.useMock) {
            return [
                { id: "mock-1", name: "Honda Civic 2022", plate: "ABC-123", currentOdometer: 15000, tyres: { front_left: { wear: 45, brand: "Michelin", position: "Front Left" }, front_right: { wear: 40, brand: "Michelin", position: "Front Right" }, back_left: { wear: 30, brand: "Michelin", position: "Rear Left" }, back_right: { wear: 35, brand: "Michelin", position: "Rear Right" } } },
                { id: "mock-2", name: "Ford F-150", plate: "XY-987", currentOdometer: 45000, tyres: { front_left: { wear: 80, brand: "Goodyear", position: "Front Left" }, front_right: { wear: 75, brand: "Goodyear", position: "Front Right" }, back_left: { wear: 60, brand: "Goodyear", position: "Rear Left" }, back_right: { wear: 65, brand: "Goodyear", position: "Rear Right" } } }
            ];
        }
        try {
            const snapshot = await this.dbInstance
                .collection('users')
                .doc(this.userId)
                .collection('vehicles')
                .get();

            return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        } catch (error) {
            console.error("Error getting vehicles:", error);
            return [];
        }
    }

    async getVehicleById(id) {
        try {
            const doc = await this.dbInstance
                .collection('users')
                .doc(this.userId)
                .collection('vehicles')
                .doc(id)
                .get();

            if (doc.exists) {
                return { id: doc.id, ...doc.data() };
            }
            return null;
        } catch (error) {
            console.error("Error getting vehicle:", error);
            return null;
        }
    }

    async addVehicle(vehicle) {
        try {
            const vehiclesRef = this.dbInstance.collection('users').doc(this.userId).collection('vehicles');
            let docRef;
            if (vehicle.id) {
                docRef = vehiclesRef.doc(vehicle.id);
                await docRef.set(vehicle);
            } else {
                docRef = await vehiclesRef.add(vehicle);
                vehicle.id = docRef.id;
                this.addActivity("Vehicle Registered", vehicle.name || vehicle.plate, "bi-car-front", "text-success", "bg-success");
            }
            return vehicle;
        } catch (error) {
            console.error("Error adding vehicle:", error);
            throw error;
        }
    }

    async updateVehicle(updatedVehicle) {
        try {
            if (!updatedVehicle.id) throw new Error("Vehicle ID required for update");

            await this.dbInstance
                .collection('users')
                .doc(this.userId)
                .collection('vehicles')
                .doc(updatedVehicle.id)
                .update(updatedVehicle);

            this.addActivity("Vehicle Updated", updatedVehicle.name || "Configuration synced", "bi-arrow-repeat", "text-primary", "bg-primary");

            return updatedVehicle;
        } catch (error) {
            console.error("Error updating vehicle:", error);
            throw error;
        }
    }

    async deleteVehicle(id) {
        try {
            await this.dbInstance
                .collection('users')
                .doc(this.userId)
                .collection('vehicles')
                .doc(id)
                .delete();
            return true;
        } catch (error) {
            console.error("Error deleting vehicle:", error);
            throw error;
        }
    }

    // --- 🌟 NEW: Blog Operations 🌟 ---

    // Fetches ONLY blogs that an admin has approved
    async getApprovedBlogs() {
        try {
            const snapshot = await this.dbInstance.collection('blogs').get();
            if (snapshot.empty) return [];

            let blogs = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

            // Filter and sort newest to oldest
            return blogs.filter(b => b.status === 'approved')
                .sort((a, b) => new Date(b.date) - new Date(a.date));
        } catch (error) {
            console.error("Error getting approved blogs:", error);
            return [];
        }
    }

    // Fetches ONLY blogs waiting for admin review
    async getPendingBlogs() {
        try {
            const snapshot = await this.dbInstance.collection('blogs').get();
            if (snapshot.empty) return [];

            let blogs = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

            // Filter and sort newest to oldest
            return blogs.filter(b => b.status === 'pending')
                .sort((a, b) => new Date(b.date) - new Date(a.date));
        } catch (error) {
            console.error("Error getting pending blogs:", error);
            return [];
        }
    }

    // Adds a new blog (Defaults to 'pending' for safety)
    async addBlog(blog) {
        try {
            // Safety check: force status to pending if it's missing
            if (!blog.status) {
                blog.status = 'pending';
            }

            const result = await this.dbInstance.collection('blogs').add(blog);
            blog.id = result.id;
            return blog;
        } catch (error) {
            console.error("Error adding blog:", error);
            throw error;
        }
    }

    // Updates the status (used for Approve / Reject buttons)
    async updateBlogStatus(id, newStatus) {
        try {
            if (!id) throw new Error("Blog ID is required to update status.");

            await this.dbInstance.collection('blogs').doc(id).update({
                status: newStatus
            });
            return true;
        } catch (error) {
            console.error(`Error updating blog ${id} to ${newStatus}:`, error);
            throw error;
        }
    }

    // --- Maintenance Operations ---

    async getMaintenanceHistory() {
        if (window.APP_CONFIG && window.APP_CONFIG.useMock) {
            return [
                { id: "m-1", date: new Date().toISOString(), type: "Rotation & Balancing", cost: 60, vehicleId: "mock-1", notes: "Routine 10k check." },
                { id: "m-2", date: new Date(Date.now() - 86400000 * 45).toISOString(), type: "Alignment", cost: 120, vehicleId: "mock-2", notes: "Wheel alignment after pothole damage." }
            ];
        }
        try {
            const snapshot = await this.dbInstance
                .collection('users')
                .doc(this.userId)
                .collection('maintenance')
                .orderBy('date', 'desc')
                .get();

            return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        } catch (error) {
            console.error("Error getting maintenance history:", error);
            return [];
        }
    }

    async addMaintenanceRecord(record) {
        try {
            const result = await this.dbInstance
                .collection('users')
                .doc(this.userId)
                .collection('maintenance')
                .add(record);

            record.id = result.id;
            this.addActivity("Maintenance Logged", record.type || "Service", "bi-wrench", "text-warning", "bg-warning");
            return record;
        } catch (error) {
            console.error("Error adding maintenance record:", error);
            throw error;
        }
    }

    // --- Recent Activity ---

    async getActivities() {
        try {
            const snapshot = await this.dbInstance
                .collection('users')
                .doc(this.userId)
                .collection('activities')
                .orderBy('timestamp', 'desc')
                .limit(5)
                .get();

            return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        } catch (error) {
            console.error("Error getting activities:", error);
            return [];
        }
    }

    async addActivity(title, subtitle, icon, iconColorClass, bgColorClass) {
        try {
            const record = {
                title: title,
                subtitle: subtitle,
                icon: icon,
                iconColorClass: iconColorClass,
                bgColorClass: bgColorClass,
                timestamp: new Date().getTime()
            };
            await this.dbInstance
                .collection('users')
                .doc(this.userId)
                .collection('activities')
                .add(record);
        } catch (error) {
            console.error("Error logging activity:", error);
        }
    }

    // --- Statistics ---

    async getFleetHealthStats() {
        const vehicles = await this.getVehicles();
        let totalTyres = 0;
        let criticalTyres = 0;
        let totalWearSum = 0;

        vehicles.forEach(v => {
            const currentOdo = Number(v.currentOdometer) || 0;

            if (v.tyres) {
                Object.values(v.tyres).forEach(t => {
                    totalTyres++;
                    let wearPercent = 0;

                    if (t.installationKm !== undefined && t.expectedLifeKm) {
                        const driven = Math.max(0, currentOdo - t.installationKm);
                        if (Number(t.expectedLifeKm) > 0) {
                            wearPercent = (driven / Number(t.expectedLifeKm)) * 100;
                        }
                    } else if (t.wear !== undefined) {
                        wearPercent = Number(t.wear);
                    }

                    if (wearPercent > 100) wearPercent = 100;

                    totalWearSum += wearPercent;
                    if (wearPercent >= 70) criticalTyres++;
                });
            }
        });

        const avgWear = totalTyres > 0 ? (totalWearSum / totalTyres) : 0;

        return {
            totalVehicles: vehicles.length,
            averageHealth: Math.round(100 - avgWear),
            criticalAlerts: criticalTyres
        };
    }

    async getActivities() {
        try {
            const snapshot = await this.dbInstance.collection('activities').orderBy('timestamp', 'desc').limit(10).get();
            return snapshot.docs.map(doc => doc.data());
        } catch (error) {
            console.error("Error fetching activities:", error);
            return [];
        }
    }

    // --- Admin Master Operations ---

    async getAdminStats() {
        try {
            const users = await this.dbInstance.collection('users').get();
            const blogs = await this.dbInstance.collection('blogs').get();

            let totalVehicles = 0;
            // Aggregate all vehicles in subcollections
            for (let user of users.docs) {
                const vehiclesSnap = await this.dbInstance.collection('users').doc(user.id).collection('vehicles').get();
                totalVehicles += vehiclesSnap.size;
            }

            return {
                totalUsers: users.size,
                totalVehicles: totalVehicles,
                approvedBlogs: blogs.docs.filter(b => b.data().status === 'approved').length,
                pendingBlogs: blogs.docs.filter(b => b.data().status === 'pending').length
            };
        } catch (error) {
            console.error("Error fetching admin stats:", error);
            return { totalUsers: 0, totalVehicles: 0, approvedBlogs: 0, pendingBlogs: 0 };
        }
    }

    async getOffers() {
        try {
            const snapshot = await this.dbInstance.collection('offers').orderBy('timestamp', 'desc').get();
            return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        } catch (error) {
            console.error("Error getting offers:", error);
            return [];
        }
    }

    async getApprovedOffers() {
        try {
            const snapshot = await this.dbInstance.collection('offers').orderBy('timestamp', 'desc').get();
            const allOffers = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            return allOffers.filter(o => o.status === 'approved');
        } catch (error) {
            console.error("Error getting approved offers:", error);
            return [];
        }
    }

    async addOffer(description, status = 'pending', shopName = 'Tyre Pulse Admin', ownerId = null) {
        try {
            const uId = ownerId || this.userId;
            const result = await this.dbInstance.collection('offers').add({
                description: description,
                status: status,
                shopName: shopName,
                ownerId: uId,
                timestamp: new Date().getTime()
            });
            return result.id;
        } catch (error) {
            console.error("Error adding offer:", error);
            throw error;
        }
    }

    async updateOfferStatus(id, newStatus) {
        try {
            if (!id) throw new Error("Offer ID is required.");
            await this.dbInstance.collection('offers').doc(id).update({
                status: newStatus
            });
            return true;
        } catch (error) {
            console.error(`Error updating offer ${id} to ${newStatus}:`, error);
            throw error;
        }
    }

    async deleteOffer(id) {
        try {
            await this.dbInstance.collection('offers').doc(id).delete();
            return true;
        } catch (error) {
            console.error("Error deleting offer:", error);
            throw error;
        }
    }

    async claimOffer(offerId, description, shopName, ownerId) {
        try {
            const user = window.authService.getUser();
            const claim = {
                offerId: offerId,
                description: description,
                shopName: shopName || 'Unknown Shop',
                ownerId: ownerId || null,
                userId: user.uid,
                userName: user.displayName || user.email || "Unknown User",
                userEmail: user.email,
                claimedAt: new Date().getTime()
            };
            const result = await this.dbInstance.collection('claimed_offers').add(claim);
            this.addActivity("Offer Claimed", description, "bi-lightning-fill", "text-warning", "bg-warning");
            return result.id;
        } catch (error) {
            console.error("Error claiming offer:", error);
            throw error;
        }
    }

    async getClaimedOffers() {
        try {
            const snapshot = await this.dbInstance.collection('claimed_offers').orderBy('claimedAt', 'desc').get();
            return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        } catch (error) {
            console.error("Error getting claimed offers:", error);
            return [];
        }
    }

    async getOwnerClaimedOffers() {
        try {
            const snapshot = await this.dbInstance.collection('claimed_offers').get();
            const allClaims = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            return allClaims.filter(c => c.ownerId === this.userId).sort((a,b) => b.claimedAt - a.claimedAt);
        } catch (error) {
            console.error("Error getting owner claimed offers:", error);
            return [];
        }
    }

    async deleteClaimedOffer(id) {
        try {
            await this.dbInstance.collection('claimed_offers').doc(id).delete();
            return true;
        } catch (error) {
            console.error("Error deleting claimed offer:", error);
            throw error;
        }
    }

    async deleteBlog(id) {
        try {
            await this.dbInstance.collection('blogs').doc(id).delete();
            return true;
        } catch (error) {
            console.error("Error deleting blog:", error);
            throw error;
        }
    }

    async getAllUsers() {
        try {
            // Exclude shop owners — only return regular users
            const users = await this.dbInstance.collection('users')
                .where('role', '!=', 'owner')
                .get();
            // Also include docs with no role field (legacy accounts)
            const noRole = await this.dbInstance.collection('users')
                .where('role', '==', 'user')
                .get();
            // Merge: use a Map to deduplicate by doc id
            const allDocs = await this.dbInstance.collection('users').get();
            const results = allDocs.docs
                .map(doc => ({ id: doc.id, ...doc.data() }))
                .filter(u => !u.role || u.role === 'user');
            return results;
        } catch (error) {
            console.error("Error fetching registered users:", error);
            return [];
        }
    }

    async deleteUserAuth(uid) {
        // Warning: This only deletes Firestore profile in a strictly client-side environment.
        // True Firebase Auth deletion requires Admin SDK/Cloud Functions.
        try {
            await this.dbInstance.collection('users').doc(uid).delete();
            return true;
        } catch (error) {
            console.error("Error soft-deleting user:", error);
            throw error;
        }
    }

    // --- Shop Profile Operations ---
    async getShopProfile() {
        try {
            const doc = await this.dbInstance.collection('users').doc(this.userId).collection('shopProfile').doc('profile').get();
            if (doc.exists) {
                return doc.data();
            }
            return null;
        } catch (error) {
            console.error("Error getting shop profile:", error);
            return null;
        }
    }

    async updateShopProfile(profileData) {
        try {
            await this.dbInstance.collection('users').doc(this.userId).collection('shopProfile').doc('profile').set(profileData, { merge: true });
            return true;
        } catch (error) {
            console.error("Error updating shop profile:", error);
            throw error;
        }
    }

    async getRegisteredShops() {
        try {
            // Use collectionGroup to query all shopProfile/profile documents across all users
            const snapshot = await this.dbInstance.collectionGroup('shopProfile').get();
            const shops = [];
            snapshot.docs.forEach(doc => {
                const data = doc.data();
                // Only include shops that have a name saved
                if (data.name && data.name.trim() !== '') {
                    // The owner's uid is the parent document of the subcollection
                    const ownerId = doc.ref.parent.parent.id;
                    shops.push({
                        name: data.name,
                        location: data.location || '',
                        phone: data.phone || '',
                        description: data.description || '',
                        ownerId: ownerId
                    });
                }
            });
            return shops.sort((a, b) => a.name.localeCompare(b.name));
        } catch (error) {
            console.error("Error getting registered shops:", error);
            return [];
        }
    }

    async getOwnersList() {
        try {
            // Primary source: query users with role:'owner'
            const ownersSnapshot = await this.dbInstance.collection('users')
                .where('role', '==', 'owner')
                .get();

            const owners = [];

            for (const userDoc of ownersSnapshot.docs) {
                const userData = userDoc.data();
                const uid = userDoc.id;

                // Try to fetch their shopProfile for shop name/location/phone
                let shopName = userData.displayName || userData.email?.split('@')[0] || 'Unknown';
                let location = '';
                let phone = '';

                try {
                    const profileDoc = await this.dbInstance
                        .collection('users').doc(uid)
                        .collection('shopProfile').doc('profile').get();
                    if (profileDoc.exists && profileDoc.data().name) {
                        shopName = profileDoc.data().name;
                        location = profileDoc.data().location || '';
                        phone    = profileDoc.data().phone    || '';
                    }
                } catch (e) { /* shopProfile not set up yet, use fallback */ }

                owners.push({
                    id:          uid,
                    displayName: userData.displayName || userData.email?.split('@')[0] || 'Unknown',
                    email:       userData.email || 'N/A',
                    createdAt:   userData.createdAt || null,
                    shopName,
                    location,
                    phone
                });
            }

            return owners.sort((a, b) => (a.shopName || '').localeCompare(b.shopName || ''));
        } catch (error) {
            console.error("Error getting owners list:", error);
            return [];
        }
    }

    // --- Appointment Operations ---

    async bookAppointment(data) {
        try {
            const user = window.authService.getUser();
            const appointment = {
                userName: user.displayName || user.email.split('@')[0],
                userEmail: user.email,
                userId: user.uid,
                ownerId: data.ownerId || null,
                shopName: data.shopName || 'Any Available Shop',
                service: data.service,
                date: data.date,
                time: data.time,
                vehicleInfo: data.vehicleInfo || '',
                notes: data.notes || '',
                status: 'pending',
                createdAt: new Date().getTime()
            };
            const result = await this.dbInstance.collection('appointments').add(appointment);
            this.addActivity('Appointment Booked', `${data.service} on ${data.date}`, 'bi-calendar-check-fill', 'text-primary', 'bg-primary');
            return result.id;
        } catch (error) {
            console.error("Error booking appointment:", error);
            throw error;
        }
    }

    async getUserAppointments() {
        try {
            const snapshot = await this.dbInstance.collection('appointments').get();
            const all = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            return all.filter(a => a.userId === this.userId).sort((a, b) => b.createdAt - a.createdAt);
        } catch (error) {
            console.error("Error getting user appointments:", error);
            return [];
        }
    }

    async getOwnerAppointments() {
        try {
            const snapshot = await this.dbInstance.collection('appointments').get();
            const all = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            return all.filter(a => a.ownerId === this.userId).sort((a, b) => b.createdAt - a.createdAt);
        } catch (error) {
            console.error("Error getting owner appointments:", error);
            return [];
        }
    }

    async getAllAppointments() {
        try {
            const snapshot = await this.dbInstance.collection('appointments').orderBy ? 
                await this.dbInstance.collection('appointments').get() :
                await this.dbInstance.collection('appointments').get();
            return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })).sort((a, b) => b.createdAt - a.createdAt);
        } catch (error) {
            console.error("Error getting all appointments:", error);
            return [];
        }
    }

    async updateAppointmentStatus(id, status) {
        try {
            await this.dbInstance.collection('appointments').doc(id).update({ status });
            return true;
        } catch (error) {
            console.error("Error updating appointment status:", error);
            throw error;
        }
    }

    async deleteAppointment(id) {
        try {
            await this.dbInstance.collection('appointments').doc(id).delete();
            return true;
        } catch (error) {
            console.error("Error deleting appointment:", error);
            throw error;
        }
    }
}

window.dbService = new DBService();