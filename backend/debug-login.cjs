
async function testLogin() {
    console.log('Testing login for emp2@gmail.com...');

    try {
        const response = await fetch('http://localhost:3000/api/auth/login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                email: 'emp2@gmail.com',
                password: 'password123',
                organizationId: null // As fixed in the frontend
            })
        });

        const data = await response.json();

        console.log(`\nStatus Code: ${response.status}`);

        if (response.ok) {
            console.log('✅ Login Successful!');
            console.log('User:', data.user.name);
            console.log('Role:', data.user.role);
            console.log('Token received:', data.token ? 'Yes' : 'No');
        } else {
            console.log('❌ Login Failed!');
            console.log('Error:', data.error);
            console.log('Message:', data.message);
        }

    } catch (error) {
        console.error('❌ Network/Script Error:', error.message);
    }
}

testLogin();
