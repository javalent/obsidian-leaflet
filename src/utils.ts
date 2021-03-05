export default class Utils {
	static async getImageDimensions(url: string): Promise<any> {
		return new Promise(function (resolved, rejected) {
			var i = new Image()
			i.onload = function () {
				resolved({ w: i.width, h: i.height })
			};
			i.src = url
		})
	}

	static async toDataURL(url: string): Promise<string> {
		const response = await fetch(url);

		const blob = await response.blob();
		return new Promise((resolve, reject) => {
			const reader = new FileReader()
			reader.onloadend = () => {
				resolve(reader.result as string)
			}
			reader.onerror = reject
			reader.readAsDataURL(blob)
		})
	}
}