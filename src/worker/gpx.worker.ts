import { GPX_OPTIONS, GPX_Data, Coordinate } from "src/@types/gpx";
import { DOMParser } from "xmldom";

const ctx: Worker = self as any;

// Respond to message from parent thread
ctx.onmessage = async (event) => {
    try {
        let str = event.data.string;
        str = str.replace(/>\s+</g, "><");
        str = str.replace(
            /gpxtpx:|gpxx:|ns3:|gpxdata:|wptx1:|ctx:|mytrails:/g,
            ""
        );
        str = str.replace(/cadence>/g, "cad>");
        str = str.replace(/heartrate>/g, "hr>");
        str = str.replace(/<\/temp>/g, "</atemp>");
        str = str.replace(/<temp>/g, "<atemp>");

        const parser = new GPXParser(str);
        ctx.postMessage({ data: parser.info });
    } catch (e) {
        ctx.postMessage({ error: e });
    }
};

export default {} as typeof Worker & (new () => Worker);
const _MAX_POINT_INTERVAL_MS = 15000;
const _SECOND_IN_MILLIS = 1000;
const _MINUTE_IN_MILLIS = 60 * _SECOND_IN_MILLIS;
const _HOUR_IN_MILLIS = 60 * _MINUTE_IN_MILLIS;
const _DAY_IN_MILLIS = 24 * _HOUR_IN_MILLIS;

const _GPX_STYLE_NS = "http://www.topografix.com/GPX/gpx_style/0/2";
const _DEFAULT_POLYLINE_OPTS = {
    color: "blue"
};
const _DEFAULT_GPX_OPTS: GPX_OPTIONS = {
    parseElements: ["track", "route", "waypoint"],
    joinTrackSegments: true,
    max_point_interval: _MAX_POINT_INTERVAL_MS,
    polyline_options: _DEFAULT_POLYLINE_OPTS
};

class GPXParser {
    info: GPX_Data;
    layers: any = {};
    options: GPX_OPTIONS;
    constructor(public xml: string, options: GPX_OPTIONS = _DEFAULT_GPX_OPTS) {
        this.options = {
            ...options,
            ..._DEFAULT_GPX_OPTS
        };
        this._init_info();
        this._parse(this.xml);
    }
    get_duration_string(duration: number, hidems: boolean) {
        let s = "";

        if (duration >= _DAY_IN_MILLIS) {
            s += Math.floor(duration / _DAY_IN_MILLIS) + "d ";
            duration = duration % _DAY_IN_MILLIS;
        }

        if (duration >= _HOUR_IN_MILLIS) {
            s += Math.floor(duration / _HOUR_IN_MILLIS) + ":";
            duration = duration % _HOUR_IN_MILLIS;
        }

        const mins = Math.floor(duration / _MINUTE_IN_MILLIS);
        duration = duration % _MINUTE_IN_MILLIS;
        if (mins < 10) s += "0";
        s += mins + "'";

        const secs = Math.floor(duration / _SECOND_IN_MILLIS);
        duration = duration % _SECOND_IN_MILLIS;
        if (secs < 10) s += "0";
        s += secs;

        if (!hidems && duration > 0)
            s += "." + Math.round(Math.floor(duration) * 1000) / 1000;
        else s += '"';

        return s;
    }

    get_duration_string_iso(duration: number, hidems: boolean) {
        const s = this.get_duration_string(duration, hidems);
        return s.replace("'", ":").replace('"', "");
    }

    // Private methods
    _merge_objs(a: Record<any, any>, b: Record<any, any>) {
        return {
            ...a,
            ...b
        };
    }

    _prepare_data_point(
        p: any,
        trans1: (...args: any[]) => any,
        trans2: (...args: any[]) => any,
        trans_tooltip: any
    ) {
        const r = [
            (trans1 && trans1(p[0])) || p[0],
            (trans2 && trans2(p[1])) || p[1]
        ];
        r.push(
            (trans_tooltip && trans_tooltip(r[0], r[1])) || r[0] + ": " + r[1]
        );
        return r;
    }

    _init_info() {
        this.info = {
            name: null,
            desc: null,
            author: null,
            copyright: null,
            waypoints: [],
            styles: [],
            coords: [],
            length: 0.0,
            flags: {
                elevation: false,
                speed: false,
                hr: false,
                duration: false,
                atemp: false,
                cad: false
            },
            elevation: {
                gain: 0.0,
                loss: 0.0,
                max: 0.0,
                min: Infinity,
                total: 0,
                avg: 0,
                points: []
            },
            speed: {
                max: 0.0,
                min: Infinity,
                avg: 0,
                total: 0,
                points: []
            },
            hr: {
                avg: 0,
                min: Infinity,
                max: 0,
                total: 0,
                points: []
            },
            duration: {
                start: null,
                end: null,
                moving: 0,
                total: 0
            },
            atemp: {
                avg: 0,
                min: Infinity,
                max: 0,
                total: 0,
                points: []
            },
            cad: {
                avg: 0,
                min: Infinity,
                max: 0,
                total: 0,
                points: []
            }
        };
    }
    _parse(input: string, options: any = this.options, async: boolean = false) {
        const cb = (gpx: XMLDocument, options: any) => {
            const layers = this._parse_gpx_data(gpx, options);
            if (!layers) {
                throw new Error("No layers found.");
            }
            this.layers = layers;
            this.info.coords = this.layers.map((layer: any) => layer.coords);
            this.info.styles = this.layers.map((layer: any) => layer.style);
        };
        const parser = new DOMParser();
        if (async) {
            setTimeout(function () {
                cb(parser.parseFromString(input, "text/xml"), options);
            });
        } else {
            cb(parser.parseFromString(input, "text/xml"), options);
        }
    }

    _parse_gpx_data(xml: XMLDocument, options = this.options) {
        let layers: any[] = [];

        const name = xml.getElementsByTagName("name");
        if (name.length > 0) {
            this.info.name = name[0].textContent;
        }
        const desc = xml.getElementsByTagName("desc");
        if (desc.length > 0) {
            this.info.desc = desc[0].textContent;
        }
        const author = xml.getElementsByTagName("author");
        if (author.length > 0) {
            this.info.author = author[0].textContent;
        }
        const copyright = xml.getElementsByTagName("copyright");
        if (copyright.length > 0) {
            this.info.copyright = copyright[0].textContent;
        }

        const parseElements = options.parseElements;
        if (parseElements.indexOf("route") > -1) {
            // routes are <rtept> tags inside <rte> sections
            const routes = xml.getElementsByTagName("rte");
            for (let i = 0; i < routes.length; i++) {
                layers.push(
                    ...this._parse_segment(routes[i], options, {}, "rtept")
                );
            }
        }

        if (parseElements.indexOf("track") > -1) {
            // tracks are <trkpt> tags in one or more <trkseg> sections in each <trk>
            const tracks = xml.getElementsByTagName("trk");
            for (let i = 0; i < tracks.length; i++) {
                const track = tracks[i];
                const polyline_options = this._extract_styling(track);

                if (options.joinTrackSegments) {
                    layers.push(
                        ...this._parse_segment(
                            track,
                            options,
                            polyline_options,
                            "trkpt"
                        )
                    );
                } else {
                    const segments = track.getElementsByTagName("trkseg");
                    for (let j = 0; j < segments.length; j++) {
                        layers.push(
                            ...this._parse_segment(
                                segments[j],
                                options,
                                polyline_options,
                                "trkpt"
                            )
                        );
                    }
                }
            }
        }

        this.info.hr.avg = Math.round(
            this.info.hr.total / this.info.hr.points.length
        );
        this.info.cad.avg = Math.round(
            this.info.cad.total / this.info.cad.points.length
        );
        this.info.atemp.avg = Math.round(
            this.info.atemp.total / this.info.atemp.points.length
        );
        this.info.speed.avg = Math.round(
            this.info.speed.total / this.info.speed.points.length
        );
        this.info.elevation.avg = Math.round(
            this.info.elevation.total / this.info.elevation.points.length
        );

        // parse waypoints and add markers for each of them
        if (parseElements.indexOf("waypoint") > -1) {
            this.info.waypoints = [];
            const el = xml.getElementsByTagName("wpt");
            for (let i = 0; i < el.length; i++) {
                var ll = {
                    lat: Number(el[i].getAttribute("lat")),
                    lng: Number(el[i].getAttribute("lon"))
                };

                const nameEl = el[i].getElementsByTagName("name");
                const name = nameEl.length > 0 ? nameEl[0].textContent : "";

                const descEl = el[i].getElementsByTagName("desc");
                const desc = descEl.length > 0 ? descEl[0].textContent : "";

                const symEl = el[i].getElementsByTagName("sym");
                const symKey = symEl.length > 0 ? symEl[0].textContent : null;

                const typeEl = el[i].getElementsByTagName("type");
                const typeKey =
                    typeEl.length > 0 ? typeEl[0].textContent : null;

                this.info.waypoints.push({
                    ...ll,
                    name,
                    desc,
                    symbol: symKey,
                    type: typeKey
                });
            }
        }
        return layers;
    }

    _parse_segment(
        line: Element,
        options: GPX_OPTIONS,
        polyline_options: any,
        tag: string
    ) {
        const el = line.getElementsByTagName(tag);
        if (!el.length) return [];

        const coords: Coordinate[] = [];
        let last = null;

        for (let i = 0; i < el.length; i++) {
            const ll: Coordinate = {
                lat: Number(el[i].getAttribute("lat")),
                lng: Number(el[i].getAttribute("lon")),
                meta: {
                    time: null,
                    elevation: null,
                    hr: null,
                    cad: null,
                    atemp: null,
                    speed: null
                }
            };
            /** Time */
            const timeEl = el[i].getElementsByTagName("time");
            if (
                timeEl.length > 0 &&
                !isNaN(Date.parse(timeEl[0].textContent))
            ) {
                ll.meta.time = new Date(Date.parse(timeEl[0].textContent));
            }
            const time_diff =
                last != null
                    ? Math.abs(
                          ll.meta.time?.valueOf() ??
                              0 - last.meta.time?.valueOf()
                      ) ?? null
                    : null;

            const eleEl = el[i].getElementsByTagName("ele");

            if (eleEl.length > 0) {
                ll.meta.elevation = parseFloat(eleEl[0].textContent);
                this.info.flags.elevation = true;
            } else if (last && last.meta?.elevation) {
                // If the point doesn't have an <ele> tag, assume it has the same
                // elevation as the point before it (if it had one).
                ll.meta.elevation = last.meta.elevation;
                this.info.flags.elevation = true;
            } else {
                ll.meta.elevation = null;
            }
            const ele_diff =
                last != null ? ll.meta.elevation - last.meta.elevation : null;
            const dist_3d = last != null ? this._dist3d(last, ll) : null;

            const speedEl = el[i].getElementsByTagName("speed");
            if (speedEl.length > 0) {
                this.info.flags.speed = true;
                ll.meta.speed = parseFloat(speedEl[0].textContent);
            } else {
                // speed in meter per second
                ll.meta.speed =
                    time_diff > 0 ? (1000.0 * dist_3d) / time_diff : null;
            }

            const hrEl = el[i].getElementsByTagNameNS("*", "hr");
            if (hrEl.length > 0) {
                this.info.flags.hr = true;
                ll.meta.hr = parseInt(hrEl[0].textContent);
                this.info.hr.points.push([ll.lat, ll.lng, ll.meta.hr]);
                this.info.hr.total += ll.meta.hr;
            }

            const cadEl = el[i].getElementsByTagNameNS("*", "cad");
            if (cadEl.length > 0) {
                this.info.flags.cad = true;
                ll.meta.cad = parseInt(cadEl[0].textContent);
                this.info.cad.points.push([ll.lat, ll.lng, ll.meta.cad]);
                this.info.cad.total += ll.meta.cad;
                if (ll.meta.cad > this.info.cad.max) {
                    this.info.cad.max = ll.meta.cad;
                }
                if (ll.meta.cad < this.info.cad.min) {
                    this.info.cad.min = ll.meta.cad;
                }
            }

            const atempEl = el[i].getElementsByTagNameNS("*", "atemp");
            if (atempEl.length > 0) {
                this.info.flags.atemp = true;
                ll.meta.atemp = parseInt(atempEl[0].textContent);
                this.info.atemp.points.push([ll.lat, ll.lng, ll.meta.atemp]);
                this.info.atemp.total += ll.meta.atemp;
            }

            if (ll.meta.elevation > this.info.elevation.max) {
                this.info.elevation.max = ll.meta.elevation;
            }
            if (ll.meta.elevation < this.info.elevation.min) {
                this.info.elevation.min = ll.meta.elevation;
            }
            this.info.elevation.total += ll.meta.elevation;
            this.info.elevation.points.push([
                ll.lat,
                ll.lng,
                ll.meta.elevation
            ]);

            if (ll.meta.speed > this.info.speed.max) {
                this.info.speed.max = ll.meta.speed;
            }
            if (ll.meta.speed < this.info.speed.min) {
                this.info.speed.min = ll.meta.speed;
            }
            this.info.speed.total += ll.meta.speed;
            this.info.speed.points.push([ll.lat, ll.lng, ll.meta.speed]);

            if (last == null && this.info.duration.start == null) {
                this.info.duration.start = ll.meta.time;
            }
            this.info.duration.end = ll.meta.time;
            this.info.duration.total += time_diff;
            if (time_diff < options.max_point_interval) {
                this.info.duration.moving += time_diff;
            }

            this.info.length += dist_3d;

            if (ele_diff > 0) {
                this.info.elevation.gain += ele_diff;
            } else {
                this.info.elevation.loss += Math.abs(ele_diff);
            }

            last = ll;
            coords.push(ll);
        }

        return [
            {
                coords,
                style: this._extract_styling(
                    line,
                    polyline_options,
                    options.polyline_options
                )
            }
        ];
    }

    _extract_styling(el: Element, base?: any, overrides?: any) {
        var style = this._merge_objs(_DEFAULT_POLYLINE_OPTS, base);
        var e = el.getElementsByTagNameNS(_GPX_STYLE_NS, "line");
        if (e.length > 0) {
            var _ = e[0].getElementsByTagName("color");
            if (_.length > 0) style.color = "#" + _[0].textContent;
            var _ = e[0].getElementsByTagName("opacity");
            if (_.length > 0) style.opacity = _[0].textContent;
            var _ = e[0].getElementsByTagName("weight");
            if (_.length > 0) style.weight = _[0].textContent;
            var _ = e[0].getElementsByTagName("linecap");
            if (_.length > 0) style.lineCap = _[0].textContent;
            var _ = e[0].getElementsByTagName("linejoin");
            if (_.length > 0) style.lineJoin = _[0].textContent;
            var _ = e[0].getElementsByTagName("dasharray");
            if (_.length > 0) style.dashArray = _[0].textContent;
            var _ = e[0].getElementsByTagName("dashoffset");
            if (_.length > 0) style.dashOffset = _[0].textContent;
        }
        return this._merge_objs(style, overrides);
    }

    _dist2d(a: any, b: any) {
        var R = 6371000;
        var dLat = this._deg2rad(b.lat - a.lat);
        var dLon = this._deg2rad(b.lng - a.lng);
        var r =
            Math.sin(dLat / 2) * Math.sin(dLat / 2) +
            Math.cos(this._deg2rad(a.lat)) *
                Math.cos(this._deg2rad(b.lat)) *
                Math.sin(dLon / 2) *
                Math.sin(dLon / 2);
        var c = 2 * Math.atan2(Math.sqrt(r), Math.sqrt(1 - r));
        var d = R * c;
        return d;
    }

    _dist3d(a: any, b: any) {
        var planar = this._dist2d(a, b);
        var height = Math.abs(b.meta.elevation - a.meta.elevation);
        return Math.sqrt(Math.pow(planar, 2) + Math.pow(height, 2));
    }

    _deg2rad(deg: number) {
        return (deg * Math.PI) / 180;
    }
}
