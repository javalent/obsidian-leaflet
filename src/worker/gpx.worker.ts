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
const _DEFAULT_GPX_OPTS = {
    parseElements: ["track", "route", "waypoint"],
    joinTrackSegments: true
};
class GPXParser {
    info: any;
    layers: any = {};
    options: Record<any, any>;
    constructor(public xml: string, options: any = {}) {
        options.max_point_interval =
            options.max_point_interval || _MAX_POINT_INTERVAL_MS;
        options.polyline_options = options.polyline_options || {};
        options.gpx_options = this._merge_objs(
            _DEFAULT_GPX_OPTS,
            options.gpx_options || {}
        );
        this.options = options;
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

        var mins = Math.floor(duration / _MINUTE_IN_MILLIS);
        duration = duration % _MINUTE_IN_MILLIS;
        if (mins < 10) s += "0";
        s += mins + "'";

        var secs = Math.floor(duration / _SECOND_IN_MILLIS);
        duration = duration % _SECOND_IN_MILLIS;
        if (secs < 10) s += "0";
        s += secs;

        if (!hidems && duration > 0)
            s += "." + Math.round(Math.floor(duration) * 1000) / 1000;
        else s += '"';

        return s;
    }

    get_duration_string_iso(duration: number, hidems: boolean) {
        let s = this.get_duration_string(duration, hidems);
        return s.replace("'", ":").replace('"', "");
    }

    // Public methods
    to_miles(v: number) {
        return v / 1.60934;
    }
    to_ft(v: number) {
        return v * 3.28084;
    }
    m_to_km(v: number) {
        return v / 1000;
    }
    m_to_mi(v: number) {
        return v / 1609.34;
    }
    ms_to_kmh(v: number) {
        return v * 3.6;
    }
    ms_to_mih(v: number) {
        return (v / 1609.34) * 3600;
    }

    get_name() {
        return this.info.name;
    }
    get_desc() {
        return this.info.desc;
    }
    get_author() {
        return this.info.author;
    }
    get_copyright() {
        return this.info.copyright;
    }
    get_distance() {
        return this.info.length;
    }
    get_distance_imp() {
        return this.to_miles(this.m_to_km(this.get_distance()));
    }

    get_start_time() {
        return this.info.duration.start;
    }
    get_end_time() {
        return this.info.duration.end;
    }
    get_moving_time() {
        return this.info.duration.moving;
    }
    get_total_time() {
        return this.info.duration.total;
    }

    get_moving_pace() {
        return this.get_moving_time() / this.m_to_km(this.get_distance());
    }
    get_moving_pace_imp() {
        return this.get_moving_time() / this.get_distance_imp();
    }
    get_moving_speed() {
        return (
            this.m_to_km(this.get_distance()) /
            (this.get_moving_time() / (3600 * 1000))
        );
    }
    get_moving_speed_imp() {
        return (
            this.to_miles(this.m_to_km(this.get_distance())) /
            (this.get_moving_time() / (3600 * 1000))
        );
    }

    get_total_speed() {
        return (
            this.m_to_km(this.get_distance()) /
            (this.get_total_time() / (3600 * 1000))
        );
    }
    get_total_speed_imp() {
        return (
            this.to_miles(this.m_to_km(this.get_distance())) /
            (this.get_total_time() / (3600 * 1000))
        );
    }

    get_elevation_gain() {
        return this.info.elevation.gain;
    }
    get_elevation_loss() {
        return this.info.elevation.loss;
    }
    get_elevation_gain_imp() {
        return this.to_ft(this.get_elevation_gain());
    }
    get_elevation_loss_imp() {
        return this.to_ft(this.get_elevation_loss());
    }
    get_elevation_data() {
        return this.info.elevation.points.map((p: any) => {
            return this._prepare_data_point(
                p,
                this.m_to_km,
                null,
                function (a: number, b: number) {
                    return a.toFixed(2) + " km, " + b.toFixed(0) + " m";
                }
            );
        });
    }
    get_elevation_data_imp() {
        return this.info.elevation.points.map((p: any) => {
            return this._prepare_data_point(
                p,
                this.m_to_mi,
                this.to_ft,
                function (a: number, b: number) {
                    return a.toFixed(2) + " mi, " + b.toFixed(0) + " ft";
                }
            );
        });
    }
    get_elevation_max() {
        return this.info.elevation.max;
    }
    get_elevation_min() {
        return this.info.elevation.min;
    }
    get_elevation_max_imp() {
        return this.to_ft(this.get_elevation_max());
    }
    get_elevation_min_imp() {
        return this.to_ft(this.get_elevation_min());
    }

    get_speed_data() {
        return this.info.speed.points.map((p: any) => {
            return this._prepare_data_point(
                p,
                this.m_to_km,
                this.ms_to_kmh,
                function (a: number, b: number) {
                    return a.toFixed(2) + " km, " + b.toFixed(2) + " km/h";
                }
            );
        });
    }
    get_speed_data_imp() {
        return this.info.elevation.points.map((p: any) => {
            return this._prepare_data_point(
                p,
                this.m_to_mi,
                this.ms_to_mih,
                function (a: number, b: number) {
                    return a.toFixed(2) + " mi, " + b.toFixed(2) + " mi/h";
                }
            );
        });
    }
    get_speed_max() {
        return this.m_to_km(this.info.speed.max) * 3600;
    }
    get_speed_max_imp() {
        return this.to_miles(this.get_speed_max());
    }

    get_average_hr() {
        return this.info.hr.avg;
    }
    get_average_temp() {
        return this.info.atemp.avg;
    }
    get_average_cadence() {
        return this.info.cad.avg;
    }
    get_heartrate_data() {
        return this.info.hr.points.map((p: any) => {
            return this._prepare_data_point(
                p,
                this.m_to_km,
                null,
                function (a: number, b: number) {
                    return a.toFixed(2) + " km, " + b.toFixed(0) + " bpm";
                }
            );
        });
    }
    get_heartrate_data_imp() {
        return this.info.hr.points.map((p: any) => {
            return this._prepare_data_point(
                p,
                this.m_to_mi,
                null,
                function (a: number, b: number) {
                    return a.toFixed(2) + " mi, " + b.toFixed(0) + " bpm";
                }
            );
        });
    }
    get_cadence_data() {
        return this.info.cad.points.map((p: any) => {
            return this._prepare_data_point(
                p,
                this.m_to_km,
                null,
                function (a: number, b: number) {
                    return a.toFixed(2) + " km, " + b.toFixed(0) + " rpm";
                }
            );
        });
    }
    get_temp_data() {
        return this.info.atemp.points.map((p: any) => {
            return this._prepare_data_point(
                p,
                this.m_to_km,
                null,
                function (a: number, b: number) {
                    return a.toFixed(2) + " km, " + b.toFixed(0) + " degrees";
                }
            );
        });
    }
    get_cadence_data_imp() {
        return this.info.cad.points.map((p: any) => {
            return this._prepare_data_point(
                p,
                this.m_to_mi,
                null,
                function (a: number, b: number) {
                    return a.toFixed(2) + " mi, " + b.toFixed(0) + " rpm";
                }
            );
        });
    }
    get_temp_data_imp() {
        return this.info.atemp.points.map((p: any) => {
            return this._prepare_data_point(
                p,
                this.m_to_mi,
                null,
                function (a: number, b: number) {
                    return a.toFixed(2) + " mi, " + b.toFixed(0) + " degrees";
                }
            );
        });
    }

    // Private methods
    _merge_objs(a: Record<any, any>, b: Record<any, any>) {
        var _: Record<any, any> = {};
        for (var attr in a) {
            _[attr] = a[attr];
        }
        for (var attr in b) {
            _[attr] = b[attr];
        }
        return _;
    }

    _prepare_data_point(
        p: any,
        trans1: (...args: any[]) => any,
        trans2: (...args: any[]) => any,
        trans_tooltip: any
    ) {
        var r = [
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
            length: 0.0,
            elevation: {
                gain: 0.0,
                loss: 0.0,
                max: 0.0,
                min: Infinity,
                total: 0,
                avg: 0,
                points: []
            },
            speed: { max: 0.0, min: Infinity, avg: 0, total: 0, points: [] },
            hr: { avg: 0, min: Infinity, max: 0, total: 0, points: [] },
            duration: { start: null, end: null, moving: 0, total: 0 },
            atemp: { avg: 0, min: Infinity, max: 0, total: 0, points: [] },
            cad: { avg: 0, min: Infinity, max: 0, total: 0, points: [] }
        };
    }
    _parse(input: string, options: any = this.options, async: boolean = false) {
        var cb = (gpx: XMLDocument, options: any) => {
            const layers = this._parse_gpx_data(gpx, options);
            if (!layers) {
                throw new Error("No layers found.");
            }
            this.layers = layers;
            this.info.coords = this.layers.map((layer: any) => layer.coords);
            this.info.styles = this.layers.map((layer: any) => layer.style);
        };
        var parser = new DOMParser();
        if (async) {
            setTimeout(function () {
                cb(parser.parseFromString(input, "text/xml"), options);
            });
        } else {
            cb(parser.parseFromString(input, "text/xml"), options);
        }
    }

    _parse_gpx_data(xml: XMLDocument, options: any = this.options) {
        let i,
            t,
            l,
            el,
            layers: any[] = [];

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

        const parseElements = options.gpx_options.parseElements;
        if (parseElements.indexOf("route") > -1) {
            // routes are <rtept> tags inside <rte> sections
            const routes = xml.getElementsByTagName("rte");
            for (i = 0; i < routes.length; i++) {
                layers = layers.concat(
                    this._parse_segment(routes[i], options, {}, "rtept")
                );
            }
        }

        if (parseElements.indexOf("track") > -1) {
            // tracks are <trkpt> tags in one or more <trkseg> sections in each <trk>
            var tracks = xml.getElementsByTagName("trk");
            for (i = 0; i < tracks.length; i++) {
                var track = tracks[i];
                var polyline_options = this._extract_styling(track);

                if (options.gpx_options.joinTrackSegments) {
                    layers = layers.concat(
                        this._parse_segment(
                            track,
                            options,
                            polyline_options,
                            "trkpt"
                        )
                    );
                } else {
                    var segments = track.getElementsByTagName("trkseg");
                    for (let j = 0; j < segments.length; j++) {
                        layers = layers.concat(
                            this._parse_segment(
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
            el = xml.getElementsByTagName("wpt");
            for (i = 0; i < el.length; i++) {
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
        options: any,
        polyline_options: any,
        tag: string
    ) {
        var el = line.getElementsByTagName(tag);
        if (!el.length) return [];

        var coords = [];
        var markers = [];
        var layers = [];
        var last = null;

        for (var i = 0; i < el.length; i++) {
            var _,
                ll: Record<any, any> = {
                    lat: Number(el[i].getAttribute("lat")),
                    lng: Number(el[i].getAttribute("lon"))
                };
            ll.meta = {
                time: null,
                elevation: null,
                hr: null,
                cad: null,
                atemp: null,
                speed: null
            };

            _ = el[i].getElementsByTagName("time");
            if (_.length > 0) {
                ll.meta.time = new Date(Date.parse(_[0].textContent));
            } else {
                ll.meta.time = new Date("1970-01-01T00:00:00");
            }
            var time_diff =
                last != null ? Math.abs(ll.meta.time - last.meta.time) : 0;

            _ = el[i].getElementsByTagName("ele");
            if (_.length > 0) {
                ll.meta.elevation = parseFloat(_[0].textContent);
            } else {
                // If the point doesn't have an <ele> tag, assume it has the same
                // elevation as the point before it (if it had one).
                ll.meta.elevation = last.meta.elevation;
            }
            var ele_diff =
                last != null ? ll.meta.elevation - last.meta.elevation : 0;
            var dist_3d = last != null ? this._dist3d(last, ll) : 0;

            _ = el[i].getElementsByTagName("speed");
            if (_.length > 0) {
                ll.meta.speed = parseFloat(_[0].textContent);
            } else {
                // speed in meter per second
                ll.meta.speed =
                    time_diff > 0 ? (1000.0 * dist_3d) / time_diff : 0;
            }

            _ = el[i].getElementsByTagName("name");
            if (_.length > 0) {
                var name = _[0].textContent;
                var ptMatchers = options.marker_options.pointMatchers || [];

                for (var j = 0; j < ptMatchers.length; j++) {
                    if (ptMatchers[j].regex.test(name)) {
                        markers.push({
                            label: name,
                            coords: ll,
                            icon: ptMatchers[j].icon,
                            element: el[i]
                        });
                        break;
                    }
                }
            }

            _ = el[i].getElementsByTagNameNS("*", "hr");
            if (_.length > 0) {
                ll.meta.hr = parseInt(_[0].textContent);
                this.info.hr.points.push([ll.lat, ll.lng, ll.meta.hr]);
                this.info.hr.total += ll.meta.hr;
            }

            _ = el[i].getElementsByTagNameNS("*", "cad");
            if (_.length > 0) {
                ll.meta.cad = parseInt(_[0].textContent);
                this.info.cad.points.push([ll.lat, ll.lng, ll.meta.cad]);
                this.info.cad.total += ll.meta.cad;
            }
            if (ll.meta.cad > this.info.cad.max) {
                this.info.cad.max = ll.meta.cad;
            }
            if (ll.meta.cad < this.info.cad.min) {
                this.info.cad.min = ll.meta.cad;
            }

            _ = el[i].getElementsByTagNameNS("*", "atemp");
            if (_.length > 0) {
                ll.meta.atemp = parseInt(_[0].textContent);
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

        // add track
        var l = {
            coords,
            style: this._extract_styling(
                line,
                polyline_options,
                options.polyline_options
            )
        };

        layers.push(l);

        return layers;
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
