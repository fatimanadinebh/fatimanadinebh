class LoadingBar {
	constructor() {
		this.dom = document.createElement('div');
		this.dom.style.position = 'absolute';
		this.dom.style.top = '50%';
		this.dom.style.left = '50%';
		this.dom.style.transform = 'translate(-50%, -50%)';
		this.dom.style.width = '300px';
		this.dom.style.height = '80px';
		this.dom.style.background = '#ffe6f0'; // light pink background
		this.dom.style.borderRadius = '12px';
		this.dom.style.display = 'flex';
		this.dom.style.flexDirection = 'column';
		this.dom.style.alignItems = 'center';
		this.dom.style.justifyContent = 'center';
		this.dom.style.boxShadow = '0 0 20px rgba(0,0,0,0.2)';
		this.dom.style.zIndex = '1000';

		// Add loading text
		this.text = document.createElement('div');
		this.text.innerText = 'Loading...';
		this.text.style.marginBottom = '8px';
		this.text.style.fontFamily = 'Arial, sans-serif';
		this.text.style.fontSize = '16px';
		this.text.style.color = '#333';

		// Bar background
		this.barBg = document.createElement('div');
		this.barBg.style.width = '90%';
		this.barBg.style.height = '10px';
		this.barBg.style.background = '#ddd';
		this.barBg.style.borderRadius = '5px';

		// Green progress bar
		this.bar = document.createElement('div');
		this.bar.style.height = '100%';
		this.bar.style.width = '0%';
		this.bar.style.background = '#00cc66'; // green color
		this.bar.style.borderRadius = '5px';
		this.bar.style.transition = 'width 0.3s ease';

		this.barBg.appendChild(this.bar);
		this.dom.appendChild(this.text);
		this.dom.appendChild(this.barBg);
		document.body.appendChild(this.dom);
	}

	set progress(value) {
		this.bar.style.width = `${100 * value}%`;
	}

	set visible(value) {
		this.dom.style.display = value ? 'flex' : 'none';
	}
}

export { LoadingBar };
