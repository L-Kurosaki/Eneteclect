import json
import heapq
import sys
import os

SELL_PRICES = {
    "wheat": 2, "wood": 3, "stone": 3, "clay": 4, 
    "fish": 4, "sheep": 5, "ore": 6
}

def dijkstra(graph, start):
    dist = {node: float('inf') for node in graph}
    dist[start] = 0
    prev = {node: None for node in graph}
    pq = [(0, start)]
    
    while pq:
        d, u = heapq.heappop(pq)
        if d > dist[u]:
            continue
        for v, weight in graph[u]:
            if dist[u] + weight < dist[v]:
                dist[v] = dist[u] + weight
                prev[v] = u
                heapq.heappush(pq, (dist[v], v))
    return dist, prev

def get_path(prev, end):
    path = []
    curr = end
    while curr is not None:
        path.append(curr)
        curr = prev[curr]
    return path[::-1]

def solve():
    # Use argument if provided, otherwise default to level1.json
    input_file = sys.argv[1] if len(sys.argv) > 1 else "level1.json"
    
    if not os.path.exists(input_file):
        print(f"Error: {input_file} not found. Ensure the evaluation engine provides it.")
        return

    with open(input_file, 'r') as f:
        level = json.load(f)

    total_ticks = level["run"]["total_ticks"]
    start_loc = level["run"]["starting_town"]

    towns = level.get("towns", {})
    nodes = level.get("nodes", {})
    routes = level.get("routes", [])

    # Build graph
    graph = {loc: [] for loc in list(towns.keys()) + list(nodes.keys())}
    for r in routes:
        u, v = r["between"]
        w = r["weight"]
        graph[u].append((v, w))
        graph[v].append((u, w))

    # Find the most profitable node
    best_node = None
    best_rate = -1
    
    for n_name, n_data in nodes.items():
        res = n_data["resource"]
        y = n_data["yield"]
        g_time = n_data["gather-time"]
        price = SELL_PRICES.get(res, 0)
        rate = (y * price) / g_time
        if rate > best_rate:
            best_rate = rate
            best_node = n_name

    if not best_node:
        print("No resource nodes found!")
        return

    # Calculate shortest paths
    dist_from_start, prev_from_start = dijkstra(graph, start_loc)
    dist_from_best, prev_from_best = dijkstra(graph, best_node)

    # Find closest town to the best node to return to for selling
    closest_town = None
    closest_dist = float('inf')
    for t_name in towns:
        if dist_from_best[t_name] < closest_dist:
            closest_dist = dist_from_best[t_name]
            closest_town = t_name

    actions = []
    ticks_used = 0

    # 1. Travel to the best node
    path_to_node = get_path(prev_from_start, best_node)
    for i in range(1, len(path_to_node)):
        actions.append({"type": "travel", "destination": path_to_node[i]})
        for v, w in graph[path_to_node[i-1]]:
            if v == path_to_node[i]:
                ticks_used += w
                break

    # 2. Gather as much as possible
    path_to_town = get_path(prev_from_best, closest_town)
    return_travel_ticks = closest_dist
    
    buffer_ticks = 8 # Time reserved for selling up to 8 distinct item types
    gather_time = nodes[best_node]["gather-time"]
    gathered_amount = 0
    
    while ticks_used + return_travel_ticks + buffer_ticks + gather_time <= total_ticks:
        actions.append({"type": "gather"})
        ticks_used += gather_time
        gathered_amount += nodes[best_node]["yield"]

    # 3. Return to the closest town
    for i in range(1, len(path_to_town)):
        actions.append({"type": "travel", "destination": path_to_town[i]})
        for v, w in graph[path_to_town[i-1]]:
            if v == path_to_town[i]:
                ticks_used += w
                break

    # 4. Calculate total accumulated inventory right before we start selling
    inventory = {res: 0 for res in SELL_PRICES}
    inventory[nodes[best_node]["resource"]] += gathered_amount
    
    for t_name, t_data in towns.items():
        rate = t_data["production"]["rate"]
        cycles = ticks_used // rate
        for res, amt in t_data["production"]["resources"].items():
            inventory[res] += cycles * amt

    # 5. Sell everything we have
    for res, qty in inventory.items():
        if qty > 0 and ticks_used < total_ticks:
            actions.append({"type": "sell", "item": res, "quantity": qty})
            ticks_used += 1

    # Output solution
    submission = {"actions": actions}
    with open("solution.txt", "w") as f:
        json.dump(submission, f, indent=2)
        
    print(f"Generated solution.txt with {len(actions)} actions. Ending tick: {ticks_used}")

if __name__ == "__main__":
    solve()
