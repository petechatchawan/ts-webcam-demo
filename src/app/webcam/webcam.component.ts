import { CommonModule } from '@angular/common';
import { AfterViewInit, Component, ElementRef, ViewChild } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { AlertController, IonicModule, LoadingController, ToastController } from '@ionic/angular';
import { addIcons } from 'ionicons';
import * as icons from 'ionicons/icons';
import { UAInfo } from 'ua-info';
import { Resolution, Webcam } from '../lib/ts-webcam';

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
    public uaInfo = new UAInfo();
    public videoDevices: MediaDeviceInfo[] = [];
    public selectedDevice: MediaDeviceInfo | null = null;
    public selectedResolution: Resolution | null = null;
    public isAudioEnabled: boolean = false;
    public isMirrorEnabled: boolean = false;
    public isAllowSwapResolution: boolean = false;
    public isAllowAnyResolution: boolean = false;

    constructor(
        private alertController: AlertController,
        private toastController: ToastController,
        private loadingController: LoadingController,
    ) {
        addIcons({ ...icons });
        this.uaInfo.setUserAgent(navigator.userAgent);
    }

    async ngAfterViewInit(): Promise<void> {
        try {
            // initialize the resolutions to use in ion-select and can reuse it
            this.initializeResolutions();

            // request camera permission
            await this.requestCameraPermission();
        } catch (error) {
            await this.showMessage('danger', 'Failed to initialize camera');
        }
    }

    private async requestCameraPermission(): Promise<void> {
        const state = await this.webcam.checkCameraPermission();
        await this.showMessage('success', 'Permission state: ' + state);

        switch (state) {
            case 'granted':
                // check device capabilities
                await this.checkDeviceCapabilities();

                // initialize the webcam
                await this.initializeWebcam();
                break;
            case 'prompt':
                await this.showPermissionExplanation();
                break;
            default:
                await this.showPermissionDeniedHelp();
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
                        await this.initializeWebcam();
                    },
                },
            ],
        });

        console.log('alert', alert);
        await alert.present();
    }

    initializeResolutions(): void {
        const resolutions = [
            // NORMAL RESOLUTIONS
            this.webcam.createResolution('4K-Portrait', 2160, 4096),
            this.webcam.createResolution('2K-Portrait', 1440, 2560),
            this.webcam.createResolution('1080p-Portrait', 1080, 1920),
            this.webcam.createResolution('720p-Portrait', 720, 1280),
            this.webcam.createResolution('640p-Portrait', 480, 640),
            this.webcam.createResolution('480p-Portrait', 360, 480),
            this.webcam.createResolution('360p-Portrait', 240, 360),

            this.webcam.createResolution('4K-Landscape', 4096, 2160),
            this.webcam.createResolution('2K-Landscape', 2560, 1440),
            this.webcam.createResolution('1080p-Landscape', 1920, 1080),
            this.webcam.createResolution('720p-Landscape', 1280, 720),
            this.webcam.createResolution('640p-Landscape', 640, 480),
            this.webcam.createResolution('480p-Landscape', 480, 360),
            this.webcam.createResolution('360p-Landscape', 360, 240),

            // SQUARE RESOLUTIONS
            this.webcam.createResolution('SQUARE-1920', 1920, 1920),
            this.webcam.createResolution('SQUARE-1080', 1080, 1080),
            this.webcam.createResolution('SQUARE-720', 720, 720),
            this.webcam.createResolution('SQUARE-480', 480, 480),
            this.webcam.createResolution('SQUARE-360', 360, 360),
        ];

        // set the resolutions
        this.webcam.setResolutions(resolutions);
    }

    private async initializeWebcam(): Promise<void> {
        console.log('Initialize Webcam...');
        this.videoDevices = await this.webcam.getVideoDevices();
        if (this.videoDevices.length === 0) {
            await this.showMessage(
                'danger',
                'No cameras found. Please check your camera connection.',
            );
            return;
        }

        this.selectedDevice = this.videoDevices[0];
        if (!this.selectedDevice) return;

        // setup the webcam
        this.webcam.setupConfiguration({
            audio: this.isAudioEnabled,
            device: this.selectedDevice,
            mirrorEnabled: this.isMirrorEnabled,
            previewElement: this.previewElement.nativeElement,
            resolution: [
                this.webcam.createResolution('1080p-Landscape', 1920, 1080),
                this.webcam.createResolution('720p-Landscape', 1280, 720),
                this.webcam.createResolution('480p-Landscape', 480, 360),
            ],
            onStart: async () => await this.handleOnStart(),
            onError: async (error: any) => this.handleOnError(error),
        });

        // start the webcam
        await this.webcam.start();
    }

    private async checkDeviceCapabilities(): Promise<void> {
        try {
            await this.showLoading('Checking device capabilities...');
            const devices = await this.webcam.getVideoDevices();
            const capabilities = [];

            // check device capabilities
            for (const device of devices) {
                const capability = await this.webcam.checkDevicesCapabilitiesData(device.deviceId);
                capabilities.push(capability);
            }

            // check supported resolutions
            const result = this.webcam.checkSupportedResolutions(
                capabilities,
                this.webcam.getResolutions(),
            );

            result.resolutions.forEach((res: any) => {
                console.log(
                    `${res.name} (${res.width}x${res.height}): ${
                        res.supported ? 'Supported' : 'Not supported'
                    }`,
                );
            });

            await this.showMessage(
                'success',
                `Supported resolutions: ${result.resolutions.length}`,
            );
        } finally {
            await this.dismissLoading();
        }
    }

    private async handleOnStart(): Promise<void> {
        if (await this.webcam.previewIsReady()) {
            // get the current device and resolution
            this.selectedDevice = this.webcam.getCurrentDevice();
            this.selectedResolution = this.webcam.getCurrentResolution();
            await this.showMessage(
                'success',
                `Opened camera ${this.selectedDevice?.label} with resolution ${this.selectedResolution?.key} successfully`,
            );

            // update the allowAnyResolution and mirror
            const config = this.webcam.getConfiguration();
            console.log('config', config);

            this.isAudioEnabled = config?.audio || false;
            this.isMirrorEnabled = config?.mirrorEnabled || false;
            this.isAllowAnyResolution = config?.allowAnyResolution || false;
            this.isAllowSwapResolution = config?.allowSwapResolution || false;
        } else {
            await this.showMessage('warning', 'Video not ready. Please wait...');
        }
    }

    private async handleOnError(error: any): Promise<void> {
        const message = error?.message || 'Unable to access camera';
        await this.showMessage('danger', message);
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
        await this.handleRequestPermission();
    }

    private async handleRequestPermission(): Promise<void> {
        if (this.webcam.needsPermissionRequest()) {
            const permissions = await this.webcam.requestPermissions();
            if (permissions.camera === 'granted') {
                // initialize the camera
                await this.initializeWebcam();
            } else {
                await this.showMessage('danger', 'Camera permission denied');
            }
        } else {
            await this.initializeWebcam();
        }
    }

    public async captureImage(): Promise<void> {
        const image = this.webcam.captureImage({
            quality: 0.9,
            mediaType: 'image/jpeg',
            scale: 0.5,
        });

        // show the image
        await this.showMessage('success', `Image captured: ${image.slice(-10)}`);
    }

    public async setDevice(device: MediaDeviceInfo): Promise<void> {
        if (device) {
            this.webcam.clearError();
            this.webcam.updateDevice(device);
        } else {
            await this.showMessage('danger', 'Failed to switch camera');
        }
    }

    public async setResolution(key: string): Promise<void> {
        const selectedResolution = this.webcam.getResolutions().find((r) => r.key === key);
        if (selectedResolution) {
            this.webcam.clearError();
            this.webcam.updateResolution(selectedResolution);
        } else {
            await this.showMessage('danger', 'Failed to change resolution');
        }
    }

    public toggleAllowAnyResolution(): void {
        if (this.webcam.isActive()) {
            this.webcam.toggle('allowAnyResolution');
            this.isAllowAnyResolution = this.webcam.isAllowAnyResolution() || false;
        }
    }

    public toggleMirror(): void {
        if (this.webcam.isActive()) {
            this.webcam.toggleMirror();
            this.isMirrorEnabled = this.webcam.isMirrorEnabled() || false;
        }
    }

    public toggleAudio(): void {
        if (this.webcam.isActive()) {
            this.webcam.toggle('audio');
            this.isAudioEnabled = this.webcam.isAudioEnabled() || false;
        }
    }

    public toggleAllowSwapResolution(): void {
        if (this.webcam.isActive()) {
            this.webcam.toggle('allowSwapResolution');
            this.isAllowSwapResolution = this.webcam.isAllowSwapResolution() || false;
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

    async showLoading(message: string) {
        const loading = await this.loadingController.create({
            message: message,
            duration: 2000,
            spinner: 'circular',
        });
        await loading.present();
    }

    async dismissLoading() {
        await this.loadingController.dismiss();
    }
}
