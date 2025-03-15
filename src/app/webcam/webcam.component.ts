import { CommonModule } from '@angular/common';
import { AfterViewInit, Component, ElementRef, ViewChild } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { AlertController, IonicModule, ToastController } from '@ionic/angular';
import { addIcons } from 'ionicons';
import * as icons from 'ionicons/icons';
import { Resolution, Webcam } from 'ts-webcam';

@Component({
    selector: 'app-webcam',
    templateUrl: './webcam.component.html',
    styleUrls: ['./webcam.component.scss'],
    standalone: true,
    imports: [IonicModule, CommonModule, FormsModule],
})
export class WebcamComponent implements AfterViewInit {
    @ViewChild('preview') previewElement!: ElementRef<HTMLVideoElement>;

    public readonly webcam = new Webcam();
    public readonly resolutions: Resolution[] = [
        this.webcam.createResolution(4096, 2160),
        this.webcam.createResolution(2560, 1440),
        this.webcam.createResolution(1920, 1080),
        this.webcam.createResolution(1280, 720),
        this.webcam.createResolution(640, 480),
        this.webcam.createResolution(640, 360),
        this.webcam.createResolution(1920, 1920),
        this.webcam.createResolution(1080, 1080),
        this.webcam.createResolution(720, 720),
        this.webcam.createResolution(480, 480),
        this.webcam.createResolution(360, 360),
    ];

    public videoDevices: MediaDeviceInfo[] = [];
    public selectedDevice: MediaDeviceInfo | null = null;
    public selectedResolution: Resolution | null = null;
    public showPermissionDialog: boolean = false;
    public showDeniedDialog: boolean = false;
    public allowAnyResolution: boolean = false;
    public mirror: boolean = false;
    public audio: boolean = false;

    constructor(
        private alertController: AlertController,
        private toastController: ToastController,
    ) {
        addIcons({ ...icons });
    }

    async ngAfterViewInit(): Promise<void> {
        try {
            const state = await this.webcam.checkCameraPermission();
            this.showMessage('success', 'Permission state: ' + state);

            // Handle permission state
            switch (state) {
                case 'granted':
                    await this.initializeCamera();
                    break;
                case 'prompt':
                    await this.showPermissionExplanation();
                    break;
                default:
                    await this.showPermissionDeniedHelp();
            }
        } catch (error) {
            this.showMessage('danger', 'Failed to initialize camera');
        }
    }

    async presentAlertConfirm() {
        console.log('presentAlertConfirm');
        const alert = await this.alertController.create({
            header: 'Confirm!',
            message: 'Message <strong>text</strong>!!!',
            buttons: [
                {
                    text: 'Cancel',
                    role: 'cancel',
                    cssClass: 'secondary',
                    handler: () => {
                        console.log('Confirm Cancel: blah');
                    },
                },
                {
                    text: 'Okay',
                    handler: async () => {
                        await this.initializeCamera();
                    },
                },
            ],
        });

        console.log('alert', alert);
        await alert.present();
    }

    private async initializeCamera(): Promise<void> {
        const devices = await this.webcam.getVideoDevices();
        this.videoDevices = devices;

        if (devices.length === 0) {
            this.showMessage('danger', 'No cameras found. Please check your camera connection.');
            return;
        }

        this.selectedDevice = devices[0];
        await this.checkDeviceCapabilities();
        await this.setupWebcam();
    }

    private async checkDeviceCapabilities(): Promise<void> {
        const devices = await this.webcam.getVideoDevices();
        const deviceCapabilities = [];
        for (const device of devices) {
            const capability = await this.webcam.checkDevicesCapabilitiesData(device.deviceId);
            deviceCapabilities.push(capability);
        }

        const result = this.webcam.checkSupportedResolutions(deviceCapabilities, this.resolutions);
        result.resolutions.forEach((res: any) => {
            console.log(
                `${res.name} (${res.width}x${res.height}): ${
                    res.supported ? 'Supported' : 'Not supported'
                }`,
            );
        });

        this.showMessage('success', `Supported resolutions: ${result.resolutions.length}`);
    }

    private async setupWebcam(): Promise<void> {
        const device = this.selectedDevice;
        if (!device) return;

        // setup the webcam
        this.webcam.setupConfiguration({
            audio: false,
            device: device,
            mirror: this.mirror,
            autoRotation: false,
            allowAnyResolution: this.allowAnyResolution,
            previewElement: this.previewElement.nativeElement,
            onStart: async () => await this.handleOnStart(),
            onError: async (error: any) => this.handleOnError(error),
        });

        // start the webcam
        await this.webcam.start();
    }

    private async handleOnStart(): Promise<void> {
        if (await this.webcam.previewIsReady()) {
            // get the current device and resolution
            this.selectedDevice = this.webcam.getCurrentDevice();
            this.selectedResolution = this.webcam.getCurrentResolution();
            this.showMessage(
                'success',
                `Opened camera ${this.selectedDevice?.label} with resolution ${this.selectedResolution?.key} successfully`,
            );

            // update the allowAnyResolution and mirror
            const config = this.webcam.getConfiguration();
            this.allowAnyResolution = config?.allowAnyResolution || false;
            this.mirror = config?.mirror || false;
        } else {
            this.showMessage('warning', 'Video not ready. Please wait...');
        }
    }

    private handleOnError(error: any): void {
        const message = error?.message || 'Unable to access camera';
        this.showMessage('danger', message);
    }

    public async showPermissionExplanation(): Promise<void> {
        const alert = await this.alertController.create({
            header: 'Permission Required',
            message: 'Camera access permission is required to take photos.',
            buttons: ['OK'],
        });

        await alert.present();
    }

    public async showPermissionDeniedHelp(): Promise<void> {
        const alert = await this.alertController.create({
            header: 'Permission Denied',
            message: 'Camera access permission was denied. Please enable it in settings.',
            buttons: ['OK'],
        });
        await alert.present();
    }

    public async handlePermissionDialogConfirm(): Promise<void> {
        this.showPermissionDialog = false;
        await this.handleRequestPermission();
    }

    private async handleRequestPermission(): Promise<void> {
        if (this.webcam.needsPermissionRequest()) {
            const permissions = await this.webcam.requestPermissions();
            if (permissions.camera === 'granted') {
                // initialize the camera
                await this.initializeCamera();
            } else {
                this.showMessage('danger', 'Camera permission denied');
            }
        } else {
            await this.initializeCamera();
        }
    }

    public captureImage(): void {
        const image = this.webcam.captureImage({
            quality: 0.9,
            mediaType: 'image/jpeg',
            scale: 0.5,
        });

        // show the image
        this.showMessage('success', `Image captured: ${image.slice(-10)}`);
    }

    public async setDevice(device: MediaDeviceInfo): Promise<void> {
        console.log('Selected device:', device);
        if (device) {
            this.webcam.clearError();
            this.webcam.updateDevice(device);
        } else {
            this.showMessage('danger', 'Failed to switch camera');
        }
    }

    public setResolution(key: string): void {
        const selectedResolution = this.resolutions.find((r) => r.key === key);
        if (selectedResolution) {
            this.webcam.clearError();
            this.webcam.updateResolution(selectedResolution);
        } else {
            this.showMessage('danger', 'Failed to change resolution');
        }
    }

    public toggleAllowAnyResolution(): void {
        if (this.webcam.isActive()) {
            this.webcam.toggle('allowAnyResolution');
            this.allowAnyResolution = this.webcam.isAllowAnyResolution() || false;
        }
    }

    public toggleMirror(): void {
        if (this.webcam.isActive()) {
            this.webcam.toggle('mirror');
            this.mirror = this.webcam.isMirror() || false;
        }
    }

    public toggleAudio(): void {
        if (this.webcam.isActive()) {
            this.webcam.toggle('audio');
            this.audio = this.webcam.isAudioEnabled() || false;
        }
    }

    public toggleTorch(): void {
        if (this.webcam.isActive()) {
            this.webcam.toggleTorch();
        }
    }

    private async showMessage(
        type: 'success' | 'warning' | 'danger',
        detail: string,
    ): Promise<void> {
        const toast = await this.toastController.create({
            message: detail,
            duration: 1500,
            position: 'top',
            color: type,
        });
        await toast.present();
    }
}
