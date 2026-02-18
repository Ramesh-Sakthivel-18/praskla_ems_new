const admin = require('./backend/firebase-admin');
const container = require('./backend/container');

async function debugManagerEmail() {
    const userRepo = container.getUserRepo();
    const orgRepo = container.getOrganizationRepo();

    try {
        const orgs = await orgRepo.findAllActive();
        console.log(`Found ${orgs.length} active organizations.`);

        for (const org of orgs) {
            const users = await userRepo.findAll(org.id);
            const emp = users.find(u => u.email === 'emp@gmail.com');

            if (emp) {
                console.log(`Found employee 'emp@gmail.com' in org ${org.id}`);
                console.log(`Manager details: ID=${emp.managerId}, Name=${emp.managerName}`);

                if (emp.managerId) {
                    const manager = await userRepo.findById(org.id, emp.managerId);
                    if (manager) {
                        console.log(`Found manager record: Name=${manager.name}, Email=${manager.email}`);
                    } else {
                        console.log(`Manager with ID ${emp.managerId} NOT FOUND in org ${org.id}`);
                    }
                } else {
                    console.log(`No managerId assigned to this employee.`);
                }
                return;
            }
        }
        console.log(`Employee 'emp@gmail.com' not found in any organization.`);
    } catch (error) {
        console.error('Debug error:', error);
    } finally {
        process.exit(0);
    }
}

debugManagerEmail();
