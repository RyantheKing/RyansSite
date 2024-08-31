---
layout: default
title: Server Control
permalink: /server/
---
<div id="pc-box"><p>
<span id="status-indicator" class="indicator busy"></span>
<span id="pc-text" class="status-text">Computer status is UNKNOWN.</span>
<form id="wol-form" style="display: none;">
    <label for="password">Password:</label>
    <input type="password" class="text-box" id="wol-password" name="password" required>
    <button class="btn" type="submit">Wake Up</button>
</form>
<p id="pc-result" style="color: red;"></p>
</p></div>

<div id="mc-box" style="display: none;"><p>
<span id="mc-indicator" class="indicator busy"></span>
<span id="mc-text" class="status-text">Minecraft Server status is UNKNOWN.</span>
<form id="mc-form" style="display: none;">
    <label for="password">Password:</label>
    <input type="password" class="text-box" id="mc-password" name="password" required>
    <button class="btn" type="submit">Turn On</button>
</form>
<p id="mc-result" style="color: red;"></p>
</p></div>

<div id="jf-box" style="display: none;"><p>
<span id="jf-indicator" class="indicator busy"></span>
<span id="jf-text" class="status-text">Jellyfin status is UNKNOWN.</span>
<form id="jf-form" style="display: none;">
    <label for="password">Password:</label>
    <input type="password" class="text-box" id="jf-password" name="password" required>
    <button class="btn" type="submit">Turn On</button>
</form>
<p id="jf-result" style="color: red;"></p>
</p></div>
\\
\\
My Minecraft server is currently private, sorry. If you are supposed to be on the whitelist but can't get in, message me.

<script>
    // async function checkContainerStatus() {
    //     try {
    //         const response = await fetch('/containerstatus');
    //         const data = await response.json();
            
    //         const minecraftElement = document.getElementById('mc-control');
    //         minecraftElement.style.display = data.minecraft ? 'none' : 'block';
    //         const jellyfinElement = document.getElementById('jf-control');
    //         jellyfinElement.style.display = data.jellyfin ? 'none' : 'block';
    //     } catch (error) {
    //         console.error('Error fetching containers status:', error);
    //     }
    // }

    let wolTime = 0;
    let mcTime = 0;
    let jfTime = 0;

    async function checkOnlineStatus() {
        try {
            const response = await fetch('/onlinestatus');
            const data = await response.json();

            let indicator = document.getElementById("status-indicator");
            if (!data.all) {
                indicator.classList.add("online");
                indicator.classList.remove("offline");
                indicator.classList.remove("busy");
                document.getElementById("pc-text").textContent = "Computer is ONLINE.";
                document.getElementById("wol-form").style.display = 'none';
                document.getElementById("mc-box").style.display = 'block';
                document.getElementById("jf-box").style.display = 'block';
            } else if (Date.now() - wolTime > 90000) {
                document.getElementById("pc-text").textContent = "Computer is OFFLINE. Enter WoL password.";
                indicator.classList.add("offline");
                indicator.classList.remove("online");
                indicator.classList.remove("busy");
                document.getElementById("wol-form").style.display = 'block';
                document.getElementById("mc-box").style.display = 'none';
                document.getElementById("jf-box").style.display = 'none';
            }

            let indicator2 = document.getElementById("mc-indicator");
            if (!data.minecraft) {
                indicator2.classList.add("online");
                indicator2.classList.remove("offline");
                indicator2.classList.remove("busy");
                document.getElementById("mc-text").textContent = "Minecraft Server is ONLINE.";
                document.getElementById("mc-form").style.display = 'none';
            } else if (Date.now() - mcTime > 60000) {
                document.getElementById("mc-text").textContent = "Minecraft Server is OFFLINE. Enter password.";
                indicator2.classList.add("offline");
                indicator2.classList.remove("online");
                indicator2.classList.remove("busy");
                document.getElementById("mc-form").style.display = 'block';
            }

            let indicator3 = document.getElementById("jf-indicator");
            if (!data.jellyfin) {
                indicator3.classList.add("online");
                indicator3.classList.remove("offline");
                indicator3.classList.remove("busy");
                document.getElementById("jf-text").textContent = "Jellyfin is ONLINE.";
                document.getElementById("jf-form").style.display = 'none';
            } else if (Date.now() - jfTime > 15000){
                document.getElementById("jf-text").textContent = "Jellyfin is OFFLINE. Enter Jellyfin password.";
                indicator3.classList.add("offline");
                indicator3.classList.remove("online");
                indicator3.classList.remove("busy");
                document.getElementById("jf-form").style.display = 'block';
            }
        } catch (error) {
            console.error('Error fetching containers status:', error);
        }
    }

    checkOnlineStatus();
    setInterval(checkOnlineStatus, 1000);

    document.getElementById('wol-form').addEventListener('submit', function(event) {
        event.preventDefault();
        const password = document.getElementById('wol-password').value;
        document.getElementById('pc-result').textContent = '';
        fetch('/wakeonlan', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded'
            },
            body: new URLSearchParams({
                'password': password
            })
        })
        .then(response => response.json())
        .then(data => {
            if (data.message) {
                document.getElementById("pc-text").textContent = "Computer is BOOTING.";
                wolTime = Date.now();
                let indicator = document.getElementById("status-indicator");
                indicator.classList.remove("offline");
                indicator.classList.remove("online");
                indicator.classList.add("busy");
                document.getElementById("wol-form").style.display = 'none';
            } else {
                document.getElementById('pc-result').textContent = data.detail;
            }
        });
    });

    document.getElementById('mc-form').addEventListener('submit', function(event) {
        event.preventDefault();
        document.getElementById('mc-result').textContent = '';
        const password = document.getElementById('mc-password').value;
        let indicator2 = document.getElementById("mc-indicator");
        indicator2.classList.remove("offline");
        indicator2.classList.remove("online");
        indicator2.classList.add("busy");
        document.getElementById("mc-form").style.display = 'none';
        document.getElementById("mc-text").textContent = "Minecraft Server is OFFLINE.";
        mcTime = Date.now();
        fetch('/wakemc', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded'
            },
            body: new URLSearchParams({
                'password': password
            })
        })
        .then(response => response.json())
        .then(data => {
            if (data.message) {
                document.getElementById("mc-text").textContent = "Minecraft Server is BOOTING.";
            } else {
                document.getElementById('mc-result').textContent = data.detail;
                mcTime = 0;
            }
        });
    });

    document.getElementById('jf-form').addEventListener('submit', function(event) {
        event.preventDefault();
        document.getElementById('jf-result').textContent = '';
        const password = document.getElementById('jf-password').value;
        let indicator3 = document.getElementById("jf-indicator");
        indicator3.classList.remove("offline");
        indicator3.classList.remove("online");
        indicator3.classList.add("busy");
        document.getElementById("jf-text").textContent = "Jellyfin is OFFLINE.";
        document.getElementById("jf-form").style.display = 'none';
        jfTime = Date.now();
        fetch('/wakejf', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded'
            },
            body: new URLSearchParams({
                'password': password
            })
        })
        .then(response => response.json())
        .then(data => {
            if (data.message) {
                document.getElementById("jf-text").textContent = "Jellyfin is BOOTING.";
            } else {
                document.getElementById('jf-result').textContent = data.detail;
                jfTime = 0;
            }
        });
    });
</script>