---
layout: post
title: Backing up a Synology NAS for cheap
description: A guide to making a cheap offsite backup for a Synology NAS using OpenMediaVault
time: 20
tags:
  - linux
  - networks
  - OpenMediaVault
  - Synology
---

My goal for this project is to document an easy to follow process for how I made a cheap backup server for a Synology NAS. \
Recently my dad got a Synology NAS to backup family files. This is great for data redundancy, as all of my files can now be stored on at least 2 devices. However, according to the [3-2-1 Backup Strategy](https://www.seagate.com/blog/what-is-a-3-2-1-backup-strategy/){:target="_blank"}, data is sufficiently safe when at least one copy of the data is offsite. Luckily, this secondary backup does not need to have all the features of a Synology NAS, because it will only backup data directly from the NAS. There is no need for a secondary server to communicate with the wide variety of devices that store data on the NAS through various Synology apps. Not needing a second Synology NAS for offsite backup is great because it allows me any hardware configuration (I can’t afford a prebuilt NAS). Although the Synology ecosystem is cool and makes the setup of the main NAS easy, hopefully this guide will help offset the cost of an otherwise very expensive offsite backup. \
It is worth noting for this guide that you will need a second location for the secondary backup server. If this is not feasible, it will be easier to use a cloud service to back up the third copy of your data, such as google drive, [proton drive](https://proton.me/drive){:target="_blank"}, Synology’s own C2 storage, or any similar service out there. Since my family shares one backup solution, but I live separately, I can safely host the offsite backup.
<br><br>

## The Hardware
This guide will assume you already have a Synology NAS that is up and running at a separate location from the soon-to-be secondary backup.
There are many options for hardware when making a backup server. The two main decisions to be made are the computer to use for the server, and the drives to use. Your choice of computer can affect how many storage drives you are able to have, how much power your server uses, and how well it can perform certain tasks. Your choice of drives can also affect how much power your server uses, but will mainly affect drive speed, cost, and noise.

### Computer Hardware Choices
Since cost is my main deciding factor, I chose to use an old Optiplex 390 that I already had. I have a couple other computers on hand like Raspberry Pis, but they are less powerful and also present a challenge when trying to connect a large number of drives. The Optiplex motherboard comes with 4 onboard SATA ports and a PCIe lane that I use to add more than 4 drives. If you plan to use the ZFS file system, it is also important that you consider the ZFS RAM recommendations. \
If you want a slightly more preconfigured hardware option, you can get a NAS board. One such board is the [CM3588 NAS Kit](https://www.friendlyelec.com/index.php?route=product%2Fproduct&product_id=294){:target="_blank"} ($130-$145) or the [CM3588 Plus NAS Kit](https://www.friendlyelec.com/index.php?route=product/product&path=60&product_id=299){:target="_blank"} ($160-$220) recommended by [Linus Tech Tips](https://youtu.be/QsM6b5yix0U){:target="_blank"}. It has a high network bandwidth and space for a sufficient number of drives while having a power draw similar to a raspberry pi.

### Drive Choices 
For my storage, I’m using HDDs. This is because they are the cheapest and I already have a few on hand. SSDs will be around twice as expensive, but will transfer data much faster and make no noise. For a Raspberry Pi, storage would be USB flash drives, or some kind of usb to sata or m.2 converter would be needed for traditional drives. It is also likely that you will need more than 4 drive connections/ports. My server uses a [PCIe SATA Expansion Card](https://www.amazon.com/gp/aw/d/B0BNF3XD96){:target="_blank"}, and similar products exist for M.2 slots. \
For the system drive (contains the OS), I am using a SATA SSD (also because I have one on hand). For many purposes, a fast OS disk is not necessary. The [OpenMediaVault documentation](https://docs.openmediavault.org/en/latest/prerequisites.html){:target="_blank"} states that “Spinning Harddisk, SSD, Disk-on-Module, CompactFlash, or USB thumb drive type drives can be used as system drive.” The drive only needs to be 4GB plus your RAM, so for my system, the OS drive should be at least 12GB (although the SSD I have is 128GB). If you buy the CM3588, you can also choose a RAM option that comes with eMMC storage so that you don’t need a separate OS drive. \
\
Once you have these parts you can assemble your backup server and move on to installing OMV. Below is picture of mine (please don’t judge). \
\
![My Server](/assets/images/posts/omvnas.jpeg){:style="display: block; margin: 0 auto; width: 75%;"}
<figcaption>A photo of my mutilated Optiplex 390 with a wooden apparatus for storing 12 drives</figcaption>
<br>

## Software (OMV)
While any Linux distro is fine, this guide will use OpenMediaVault, since it comes with the tools necessary and runs on any device. \
Below are guides for installing OpenMediaVault on a variety of devices:
	⁃	[All x86 and some ARM devices](https://docs.openmediavault.org/en/latest/installation/via_iso.html){:target="_blank"} (you will need a USB drive)
	⁃	[Raspberry Pi](https://wiki.omv-extras.org/doku.php?id=omv7:raspberry_pi_install){:target="_blank"}
	⁃	[CM3588](https://wiki.friendlyelec.com/wiki/index.php/CM3588#Install_OS){:target="_blank"} (Use either the OMV image provided by FriendlyElec or install Debian and follow the install on Debian instructions.)
	⁃	[Installation for SBC chips](https://wiki.omv-extras.org/doku.php?id=omv7:armbian_bookworm_install){:target="_blank"} (Use this method for ARM SBC chips other than the raspberry pi.
Once you have installed OMV, you can quickly setup the server to back up your Synology NAS.
<br><br>

## OMV Plugins
OMV comes with everything you need. However, available for install are a variety of plugins to help you do more things with your server. \
First you will want to install omv-extras, which will allow you to install third-party plugins. If you installed using the omv-extras documentation for the raspberry pi or SBC boards, this is already done. Otherwise, you can do this by running the install script in an ssh window. If ssh doesn’t seem to be working, the ssh settings are controlled in the web GUI at `Services -> SSH`. Make sure to disable root login in the SSH settings and instead create a user that you give the `_ssh` and `sudo` groups, which will let you use ssh from that new account. \
Then login with the new account and enter root mode to run the following command:
```bash
wget -O - https://github.com/OpenMediaVault-Plugin-Developers/packages/raw/master/install | bash
```
All plugins can now be installed from the web GUI by going to `System -> Plugins`.
Here are some useful plugins you might consider for this project depending on your needs:
* Flashmemory plugin (IMPORTANT: This plugin decreases writes to permanent storage. It is important to have if your OS disk is solid state. No configuration needed after install)
* Wireguard plugin (Useful if you want to connect to the server from a different network)
* AutoShutdown plugin (Automatically turns off server and turns back on at a specific time to save power. This is useful since Synology backups only happen for a couple hours each day.)
* omv-backup plugin (I use this plugin to backup the OMV system to my Synology NAS)
* ClamAV plugin (a useful anti-virus toolkit that can be useful if your server talks to windows machines that may upload viruses)
* Fail2Ban plugin (protects your server by blocking requests from devices with too many failed login attempts)
* ShareRootFS plugin (allows creation of shared folders on the root (OS) drive. Needed for docker-compose plugin but useful for other things too.)

None of these plugins are strictly necessary for this tutorial, although you should at least install the flashmemory plugin because it requires no setup and can only benefit you. You should experiment with the plugins, as they are part of what makes OMV so powerful.
<br><br>

## Configuring the backup
There are 3 main steps to configuring OMV to be used as a backup server. First we need to set up a file system and shared folder to back up the data to. Then we need to configure a VPN to allow the servers to communicate across the internet. Finally we need to set up an rsync server and Synology Hyperbackup task to transfer the data to our new server.

### File System Setup 
If you haven’t already, plug in your data drives (they should have been removed for the OMV installation). They should then be visible in the `Storage -> Drives` where you can note the disk paths and adjust settings like write-cache, spin-down/power usage/performance, and S.M.A.R.T. reporting. \
First wipe the disks to make sure the partition table is correct. Then go to `Storage -> File Systems` and click `create and mount a file system`. BTRFS is supported out of the box in OMV for parity file systems. Alternatively you can use the [SnapRAID](https://wiki.omv-extras.org/doku.php?id=omv7:omv7_plugins:snapraid){:target="_blank"} or ZFS plugins for other parity options. \
\
Once your file system is created and mounted, head over to `Storage -> Shared Folders`. Click `Create` to make a new folder and set the File system to the one you made earlier as well as picking a name. This folder is where all the data from your Synology NAS will be stored. Don't edit the `relative path` field, it will be created automatically. You can also set the permissions so that only administrators have access.

### Synology VPN Setup
Next, we will want to connect to our Synology NAS via the built in VPN it has. First, switch over to the Synology Disk Station Manager interface and open the `VPN Server` application menu. Navigate to `OpenVPN` and enable the OpenVPN server. Here you can adjust settings for the VPN server such as the maximum number of connections or IP address range of connected clients. Most settings can stay the same, but you can enable IPv6 or disable access to the server's LAN if you would like. Once you apply the changes, make sure to click `Export Configuration` to download the `.ovpn` file clients will need to connect. \
\
![OpenVPN Setup](/assets/images/posts/openvpn.png){:style="display: block; margin: 0 auto; width: 80%;"}

After enabling the VPN, head over to the Privilege section and make sure OpenVPN is only enabled for users who need it. I use one VPN account that has a different password from any of the other user accounts so that compromised user login details don't allow bad actors remote access to the NAS. You will also need a dedicated user account that only OpenMediaVault will use. I recommend going to `Control Panel -> User & Group` and denying access to all folders and applications for any accounts that have access to the VPN. This separates credentials, requiring different passwords for remote access and making file system changes to the NAS. \
\
Lastly we need to ensure that when the backup server connects to the Synology NAS, it always uses the same IP address. This is important so that Synology knows where to backup files to. First go to `Control Panel -> Terminal & SNMP` and tick `Enable SSH service`. Now you can ssh into your Synology NAS so that we can add a configuration file. SSH in with:
```bash
ssh username@<IP> -p <port>
```
Where `username` is an admin account with sudo privileges, `IP` is the IP address of your NAS, and `port` is the ssh port (`22` if you didn't change it). Once logged in, run the following commands:
```bash
cd /usr/syno/etc/packages/VPNCenter
sudo mkdir userIPs
sudo chmod 0755 userIPs
```
This will make the directory in which we will put the configuration files for users with static VPN IPs.
Next to edit the OpenVPN configuration:
```bash
cd /usr/syno/etc/packages/VPNCenter/openvpn
sudo vi openvpn.conf
```
Once the `vi` tool opens, hit the `I` key on you keyboard to edit, and you should see `-- INSERT --` pop up in the bottom left of the window. Then insert the following around line 10, after the line that starts with "server".
```bash
client-config-dir /usr/syno/etc/packages/VPNCenter/userIPs/
```
To save, press the `esc` key and then type `:wq` and hit `enter`. \
\
For the following commands, you may need to change `volume1` to a different volume depending on which folder the `@appstore` directory is in. (You can just use trial and error if you are unsure what volume it is.)
```bash
cd /volume1/@appstore/VPNCenter/etc/openvpn
sudo vi radiusplugin.cnf
```
Set the `overwriteccfiles` flag to `false` or add the line if it doesn't exist and save the file the same as you did above.
```bash
overwriteccfiles=false
```
Finally go back to the userIPs folder.
```bash
cd /usr/syno/etc/packages/VPNCenter/userIPs
```
Run the following command to create and edit a new file where `<username>` is replaced with the name of the account you created for your backup server to connect with.
```bash
sudo vi <username>
```
For example, I used `sudo vi ServerVPN`.
#### Choose static IP address
To set the static IP address, we will add a single line to the file.
```bash
ifconfig-push X.X.X.22 X.X.X.21
```
`X.X.X` is the Dynamic IP address for your configuration which was automatically set or changed by you in `VPN Server -> OpenVPN -> Dynamic IP address`. The last digit of the first IP is any multiple of 4, plus 2. The last digit of the second IP is any multiple of 2, plus 1. \
For example, if I were to use the Dynamic IP address set in the [screenshot above](#synology-vpn-setup), the file would look like this (I chose 7 arbritarily, but my last digits are calculated by `4*7+2=30` and `4*7+1=29`):
```bash
ifconfig-push 10.165.0.30 10.165.0.29
```
Finally adjust the permissions of the user config file and reboot.
```bash
sudo chmod 0644 <username>
sudo reboot
```
If you haven't already, to make sure devices on external networks can connect to your VPN Server, forward port `1194` over `UDP` on the router your Synology NAS connects to.
![Port Forwarding](/assets/images/posts/portforward.png){:style="display: block; margin: 0 auto; width: 100%;"}
<figcaption>What the port forwarding setting looks like on my Linksys router</figcaption>
<br>

### OMV VPN Setup
Next we have to run a few commands so that OpenMediaVault can connect to our Synology NAS. First we will install OpenVPN3. The general instructions can be found [here](https://community.openvpn.net/openvpn/wiki/OpenVPN3Linux){:target="_blank"}, but I will include how to install for OMV systems. Make sure to run commands as root (run `sudo su` first) \
\
Install support packages:
```bash
apt install apt-transport-https curl
```
Get OpenVPN package signing key
```bash
curl -sSfL https://packages.openvpn.net/packages-repo.gpg >/etc/apt/keyrings/openvpn.asc
echo "deb [signed-by=/etc/apt/keyrings/openvpn.asc] https://packages.openvpn.net/openvpn3/debian bookworm main" >>/etc/apt/sources.list.d/openvpn3.list
```
As of the writing of this post, the latest version of OpenMediaVault is based on Debian bookworm. If the release name for the Debian version isn't `bookworm` anymore, change the second line to reflect the current codename (you can check by running `cat /etc/os-release` and looking at the `VERSION_CODENAME` field). \
\
Finally, install openvpn3:
```bash
apt update
apt install openvpn3
```
Now that openvpn3 is installed, we just need to allow it to connect automatically using the configuration file that you downloaded from Synology DSM.
```bash
cd /etc/openvpn3/autoload
```
After moving to the autoload folder, create the openvpn config file.
```bash
sudo vi VPNConfig.ovpn
```
Paste the contents of the `VPNConfig.ovpn` file you downloaded from the Synology DSM. Before you save, we will have to make a few changes. \
On the very first line, above `dev tun`, add the following line:
```bash
client
```
Next, on the 4th line, change `YOUR_SERVER_IP` to the external IP address of the network your Synology NAS is on. You can check this by running `curl ifconfig.me` while connected via SSH to your Synology NAS, or by googling "what's my ip" on a computer connected to the same network as your NAS (make sure you aren't connected to a VPN).
```bash
remote YOUR_SERVER_IP 1194
```
Beneath the line `reneg-sec 0` add:
```bash
data-ciphers AES-256-CBC
```
and under `auth-user-pass` add:
```bash
auth-nocache
```
Finally, change the single quotes on the last line to double quotes, as some openvpn clients will read this line incorrectly otherwise:
```bash
verify-x509-name "synology" name
```
You can now save the file and exit `vi`. \
\
The last file is pretty straightforward. It contains the details on how to connect to the config you just created. Create it with:
```bash
sudo vi VPNConfig.autoload
```
If you used a different file name for the `.ovpn` file, make sure it's consistent with the `.autoload` file.
Add the following to the file and save it:
```json
{
    "autostart": true,
    "user-auth": {
        "autologin": true,
        "username": "",
        "password": ""
    }
}
```
For username and password, set the username and password of the Synology account you created for your backup server (not the Synology admin credentials). As I mentioned earlier in the article, it is essential that this account has no read or write access to any of the files or applications on your NAS and that this username and password is not used anywhere else, even for other VPN connections. This is because we have to store the password in plaintext which is not very secure, so the account needs to be isolated from access to other parts of the Synology system as much as possible. \
\
Lastly, we just start the `openvpn3-autoload` service, and now your backup server should connect to the Synology NAS automatically whenever it is on.
```bash
sudo systemctl enable openvpn3-autoload
sudo systemctl start openvpn3-autoload
```
Finally, the two systems should be securely linked! You can confirm this by pinging the internal IP of the Synology NAS from the OpenMediaVault server.
```bash
ping <Synology Local IP>
```

### Rsync setup
Before we set up Synology Hyperbackup, we have to create an rsync server for it to connect to. First we will create an account that will be responsible for all rsync operations. \
Go to `Users -> Users -> Create` and create a user (mine's called "rsync"). Give it a password, assign in the group `nogroup`, and check "Disallow account modification". Once you create the user, select it from the list of users and click "Shared folder permissions". Give it read/write access to the Synology backup folder you created and deny it from accessing all other folders. \
If you encounter permissions errors later, you may need to adjust the ACLs of the Synology backup folder to make your rsync user the owner. In that case go to `Storage -> Shared Folders -> select the folder -> Access control list`. Then set the rsync user as Owner, with Read/Write/Execute permissions and deny access to everything else.
![ACL Example](/assets/images/posts/acls.png){:style="display: block; margin: 0 auto; width: 100%;"}
<figcaption>Example of how to set ACLs for the Synology backup folder if you run into permissions errors</figcaption>

Next, open the OpenMediaVault web workbench and go to `Services -> Rsync -> Server`. \
First click on `Settings` and check the box to enable Rsync. I'm using port 873, but you can use any unused port, just make sure you remember it for later. \
After enabling the rsync server, go to `Modules` and click the button to create a new module. `Shared folder` should be set to the shared folder you created at the start. For the `Name` I just used the same name as the Shared folder, but you can use anything. For `User`, select the user you just created and for `Group` select `nogroup`. \
The next section is the `Users` section. This is separate from users on the OMV system, it is instead a list of names and passwords for you to hand out to services who use this rsync server, so they can validate that they have access. Create a new user for this module by clicking the create button. For the name, I use the same name as the account doing the file transfers (I use `rsync` as the name). You can use any name however. For `Password`, make sure it is unique from any other passwords on the system. \
\
Lastly make sure:
* `Use chroot` is checked
* `Authenticate users` is checked
* `Read-only` is NOT checked
* `Write-only` is NOT checked
* `List module` is checked
* `Hosts allow` contains the LOCAL IP address of your Synology NAS
* `Hosts deny` is set to `ALL`

You can now save and your rsync server should be operational!

### Synology Hyperbackup
Open up the Synology DSM interface and open the Hyper Backup app. If it doesn't exist, download it from the Package Center. Create a new backup and select `Folders and Packages` as the backup type. \
For the backup destination, select rsync. You can choose either Single version or Multiple versions for the backup version type. \
On the backup destination settings page, set the following:
* Set `Server type` to `rsync-compatible server`
* Set `Server name or IP address` to the the static IP address you configured all the way back [here](#choose-static-ip-address) (the first one). Per my example: `10.165.0.30`.
* Set `Transfer encryption` to off. (You could set this to on, but I haven't been able to get it to work. Besides, OpenVPN already encrypts the traffic, so you are only protecting against threats on the local network.)
* `Port` is the rsync port on OMV
* `Username` is the username you set inside of the rsync module settings in OMV
* `Password` is the password you set for the rsync module
* Click on the `Backup module` drop-down, the rsync module you created should automatically advertise itself.

Now you are done! You can select the folders and applications you want to back up, enable settings like client-side encryption (if you are worried about the security of the files on your OMV server), and create a backup schedule. \
The first backup will take a long time especially if you have slow internet (I had to do the initial backup by moving my server to the same network as my NAS temporarily), but subsequent backups should only transfer the changes in data. \
\
Hopefully I covered everything in this guide. If you have any questions, feel free to [contact](/contact) me!