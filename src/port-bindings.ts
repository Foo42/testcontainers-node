import { PortMap as DockerodePortMap } from "dockerode";
import { Port, PortString } from "./port";
import { RandomSocketClient, SocketClient } from "./socket-client";

export class PortBinder {
    constructor(private readonly socketClient: SocketClient = new RandomSocketClient()) {}

    public async bind(ports: Port[]): Promise<PortBindings> {
        const portMap = await this.createPortMap(ports);
        return new DockerodePortBindings(portMap);
    }

    private async createPortMap(ports: Port[]): Promise<PortMap> {
        const portMap = new PortMap();
        for (const port of ports) {
            portMap.setMapping(port, await this.socketClient.getPort());
        }
        return portMap;
    }
}

export interface PortBindings {
    getMappedPort(port: Port): Port;
    getExposedPorts(): ContainerExposedPorts;
    getPortBindings(): ContainerPortBindings;
}

class DockerodePortBindings implements PortBindings {
    constructor(private readonly portMap: PortMap) {}

    public getMappedPort(port: Port): Port {
        const mappedPort = this.portMap.getMapping(port);
        if (!mappedPort) {
            throw new Error(`No port mapping found for "${port}". Did you forget to bind it?`);
        }
        return mappedPort;
    }

    public getExposedPorts(): ContainerExposedPorts {
        const exposedPorts: ContainerExposedPorts = {};
        for (const [containerPort] of this.portMap.iterator()) {
            exposedPorts[containerPort.toString()] = {};
        }
        return exposedPorts;
    }

    public getPortBindings(): ContainerPortBindings {
        const portBindings: ContainerPortBindings = {};
        for (const [containerPort, hostPort] of this.portMap.iterator()) {
            portBindings[containerPort.toString()] = [{ HostPort: hostPort.toString() }];
        }
        return portBindings;
    }
}

export class FakePortBindings implements PortBindings {
    constructor(
        private readonly portMap: PortMap,
        private readonly containerExposedPorts: ContainerExposedPorts,
        private readonly containerPortBindings: ContainerPortBindings
    ) {}

    public getMappedPort(port: Port): Port {
        return this.portMap.getMapping(port)!;
    }

    public getExposedPorts(): ContainerExposedPorts {
        return this.containerExposedPorts;
    }

    public getPortBindings(): ContainerPortBindings {
        return this.containerPortBindings;
    }
}

export class PortMap {
    private readonly portMap = new Map<Port, Port>();

    public getMapping(port: Port): Port | undefined {
        return this.portMap.get(port);
    }

    public setMapping(key: Port, value: Port): void {
        this.portMap.set(key, value);
    }

    public iterator(): Iterable<[Port, Port]> {
        return this.portMap;
    }
}

type ContainerExposedPorts = { [port in PortString]: {} };

type ContainerPortBindings = DockerodePortMap;
